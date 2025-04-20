package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Peer struct {
	conn     *websocket.Conn
	pc       *webrtc.PeerConnection
	username string
	room     string
	isLeader bool // Флаг, указывающий, является ли пир ведущим
}

type RoomInfo struct {
	Leader string `json:"leader"`
	Viewer string `json:"viewer"`
}

var (
	peers   = make(map[string]*Peer) // Все подключенные пиры
	rooms   = make(map[string]*Peer) // Комнаты: ключ - ID комнаты, значение - ведущий пир
	mu      sync.Mutex
	letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func randSeq(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func logStatus() {
	mu.Lock()
	defer mu.Unlock()

	log.Printf("Статус - Подключений: %d, Комнат: %d", len(peers), len(rooms))
	for room, leader := range rooms {
		viewer := ""
		for _, peer := range peers {
			if peer.room == room && !peer.isLeader {
				viewer = peer.username
				break
			}
		}
		log.Printf("Комната '%s': ведущий=%s, ведомый=%s", room, leader.username, viewer)
	}
}

func sendRoomInfo(room string) {
	mu.Lock()
	defer mu.Unlock()

	leader, exists := rooms[room]
	if !exists {
		return
	}

	// Находим ведомого в этой комнате
	var viewer *Peer
	for _, peer := range peers {
		if peer.room == room && !peer.isLeader {
			viewer = peer
			break
		}
	}

	roomInfo := RoomInfo{
		Leader: leader.username,
		Viewer: "",
	}

	if viewer != nil {
		roomInfo.Viewer = viewer.username
	}

	// Отправляем информацию о комнате всем участникам
	for _, peer := range peers {
		if peer.room == room {
			err := peer.conn.WriteJSON(map[string]interface{}{
				"type": "room_info",
				"data": roomInfo,
			})
			if err != nil {
				log.Printf("Ошибка отправки информации о комнате %s: %v", peer.username, err)
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		logStatus()
		w.Write([]byte("Статус записан в лог"))
	})

	log.Println("Сервер запущен на :8080")
	logStatus()
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Ошибка обновления до WebSocket:", err)
		return
	}
	defer conn.Close()

	remoteAddr := conn.RemoteAddr().String()
	log.Printf("Новое подключение от: %s", remoteAddr)

	var initData struct {
		Action   string `json:"action"`
		Room     string `json:"room"`
		Username string `json:"username"`
		IsLeader bool   `json:"isLeader"`
	}

	if err := conn.ReadJSON(&initData); err != nil {
		log.Printf("Ошибка чтения данных инициализации от %s: %v", remoteAddr, err)
		return
	}

	log.Printf("Пользователь '%s' пытается %s комнату '%s' (ведущий: %v)",
		initData.Username, initData.Action, initData.Room, initData.IsLeader)

	mu.Lock()
	defer mu.Unlock()

	// Конфигурация WebRTC
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
			{URLs: []string{"stun:stun1.l.google.com:19302"}},
			{URLs: []string{"stun:stun2.l.google.com:19302"}},
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,
		BundlePolicy:       webrtc.BundlePolicyMaxBundle,
		RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,
		SDPSemantics:       webrtc.SDPSemanticsUnifiedPlan,
	}

	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("Ошибка создания PeerConnection для %s: %v", initData.Username, err)
		return
	}

	peer := &Peer{
		conn:     conn,
		pc:       peerConnection,
		username: initData.Username,
		room:     initData.Room,
		isLeader: initData.IsLeader,
	}

	// Обработка входящих сообщений
	go func() {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Printf("Соединение закрыто %s: %v", initData.Username, err)
				handleDisconnect(peer)
				break
			}

			var data map[string]interface{}
			if err := json.Unmarshal(msg, &data); err != nil {
				log.Printf("Ошибка JSON от %s: %v", initData.Username, err)
				continue
			}

			handleMessage(peer, data)
		}
	}()

	// Обработка подключения в зависимости от типа пользователя (ведущий/ведомый)
	if initData.IsLeader {
		handleLeaderConnection(peer, initData.Room)
	} else {
		handleViewerConnection(peer, initData.Room)
	}

	peers[remoteAddr] = peer
	logStatus()
}

func handleLeaderConnection(leader *Peer, roomId string) {
    mu.Lock()
    defer mu.Unlock()

    // Если комната уже существует, выгоняем предыдущего ведущего
    if existingLeader, exists := rooms[roomId]; exists {
        log.Printf("Комната %s уже существует, отключаем старого ведущего %s", roomId, existingLeader.username)
        existingLeader.conn.WriteJSON(map[string]interface{}{
            "type": "error",
            "data": "Вы были отключены, так как новый ведущий занял комнату",
        })
        existingLeader.conn.Close()
        delete(peers, existingLeader.conn.RemoteAddr().String())
    }

    // Создаем новую комнату с текущим ведущим (здесь используется параметр leader)
    rooms[roomId] = leader
    log.Printf("Создана комната %s с ведущим %s", roomId, leader.username)

    // Отправляем подтверждение ведущему (здесь используется параметр leader)
    leader.conn.WriteJSON(map[string]interface{}{
        "type": "room_created",
        "data": roomId,
    })

    sendRoomInfo(roomId)
}

func handleViewerConnection(viewer *Peer, roomId string) {
    mu.Lock()
    defer mu.Unlock()

    // Проверяем, существует ли комната
    leader, exists := rooms[roomId]
    if !exists {
        log.Printf("Комната %s не существует, отказываем ведомому %s", roomId, viewer.username)
        viewer.conn.WriteJSON(map[string]interface{}{
            "type": "error",
            "data": "Комната не существует",
        })
        viewer.conn.Close()
        return
    }

    // Проверяем, есть ли уже ведомый в комнате
    var existingViewer *Peer
    for _, peer := range peers {
        if peer.room == roomId && !peer.isLeader {
            existingViewer = peer
            break
        }
    }

    // Если ведомый уже есть, отключаем его
    if existingViewer != nil {
        log.Printf("В комнате %s уже есть ведомый %s, отключаем его", roomId, existingViewer.username)
        existingViewer.conn.WriteJSON(map[string]interface{}{
            "type": "error",
            "data": "Вы были отключены, так как новый ведомый присоединился к комнате",
        })
        existingViewer.conn.Close()
        delete(peers, existingViewer.conn.RemoteAddr().String())
    }

    // Добавляем нового ведомого в комнату
    viewer.room = roomId
    log.Printf("Ведомый %s присоединился к комнате %s (ведущий: %s)",
        viewer.username, roomId, leader.username) // Используем leader здесь

    // Отправляем подтверждение ведомому
    viewer.conn.WriteJSON(map[string]interface{}{
        "type": "room_joined",
        "data": map[string]interface{}{
            "room":   roomId,
            "leader": leader.username, // Используем leader здесь
        },
    })

    // Отправляем информацию о комнате всем участникам
    sendRoomInfo(roomId)
}

func handleMessage(sender *Peer, data map[string]interface{}) {
	mu.Lock()
	defer mu.Unlock()

	roomId := sender.room
	if roomId == "" {
		return
	}

	// Пересылаем сообщение другому участнику комнаты
	for _, peer := range peers {
		if peer.room == roomId && peer != sender {
			if err := peer.conn.WriteJSON(data); err != nil {
				log.Printf("Ошибка отправки сообщения %s: %v", peer.username, err)
			}
		}
	}
}

func handleDisconnect(peer *Peer) {
	mu.Lock()
	defer mu.Unlock()

	remoteAddr := peer.conn.RemoteAddr().String()
	delete(peers, remoteAddr)

	if peer.isLeader {
		// Если отключился ведущий, удаляем комнату и отключаем ведомого
		if _, exists := rooms[peer.room]; exists {
			log.Printf("Ведущий %s отключился, удаляем комнату %s", peer.username, peer.room)
			delete(rooms, peer.room)

			// Отключаем ведомого, если он есть
			for _, p := range peers {
				if p.room == peer.room && !p.isLeader {
					p.conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"data": "Ведущий отключился, комната закрыта",
					})
					p.conn.Close()
					delete(peers, p.conn.RemoteAddr().String())
					break
				}
			}
		}
	} else {
		// Если отключился ведомый, просто обновляем информацию о комнате
		log.Printf("Ведомый %s отключился от комнаты %s", peer.username, peer.room)
		sendRoomInfo(peer.room)
	}

	logStatus()
}