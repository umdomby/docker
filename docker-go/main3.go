package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"strings"
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
	isLeader bool // Новое поле для определения ведущего
}

type RoomInfo struct {
	Users    []string `json:"users"`
	Leader   string   `json:"leader"`   // Добавлено поле ведущего
	HasSlots bool     `json:"hasSlots"` // Есть ли свободные слоты
}

var (
	peers   = make(map[string]*Peer)
	rooms   = make(map[string]*RoomInfo) // Изменили структуру хранения комнат
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

	log.Printf("Status - Connections: %d, Rooms: %d", len(peers), len(rooms))
	for room, info := range rooms {
		log.Printf("Room '%s' (Leader: %s, Users: %v)", room, info.Leader, info.Users)
	}
}

func sendRoomInfo(room string) {
	mu.Lock()
	defer mu.Unlock()

	if info, exists := rooms[room]; exists {
		for _, peer := range peers {
			if peer.room == room {
				err := peer.conn.WriteJSON(map[string]interface{}{
					"type": "room_info",
					"data": info,
				})
				if err != nil {
					log.Printf("Error sending room info to %s: %v", peer.username, err)
				}
			}
		}
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	remoteAddr := conn.RemoteAddr().String()
	log.Printf("New connection from: %s", remoteAddr)

	var initData struct {
		Room     string `json:"room"`
		Username string `json:"username"`
		IsLeader bool   `json:"isLeader"` // Новое поле для определения ведущего
	}
	if err := conn.ReadJSON(&initData); err != nil {
		log.Printf("Read init data error from %s: %v", remoteAddr, err)
		return
	}

	log.Printf("User '%s' joining room '%s' as %s", initData.Username, initData.Room, map[bool]string{true: "leader", false: "follower"}[initData.IsLeader])

	mu.Lock()

	// Проверяем существование комнаты
	roomInfo, roomExists := rooms[initData.Room]

	if initData.IsLeader {
		// Если это ведущий
		if roomExists {
			// Если комната уже существует, удаляем старую
			for _, username := range roomInfo.Users {
				if peer, ok := peers[username]; ok {
					peer.conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"data": "Leader reconnected, you are disconnected",
					})
					peer.conn.Close()
					delete(peers, username)
				}
			}
			delete(rooms, initData.Room)
		}

		// Создаем новую комнату
		rooms[initData.Room] = &RoomInfo{
			Users:    []string{initData.Username},
			Leader:   initData.Username,
			HasSlots: true,
		}
	} else {
		// Если это ведомый
		if !roomExists {
			conn.WriteJSON(map[string]interface{}{
				"type": "error",
				"data": "Room does not exist",
			})
			mu.Unlock()
			return
		}

		if !roomInfo.HasSlots {
			conn.WriteJSON(map[string]interface{}{
				"type": "error",
				"data": "Room is full",
			})
			mu.Unlock()
			return
		}

		// Если в комнате уже есть ведомый, удаляем его
		for _, username := range roomInfo.Users {
			if username != roomInfo.Leader {
				if peer, ok := peers[username]; ok {
					peer.conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"data": "Another follower connected, you are disconnected",
					})
					peer.conn.Close()
					delete(peers, username)
				}
			}
		}

		// Добавляем нового ведомого
		roomInfo.Users = []string{roomInfo.Leader, initData.Username}
		roomInfo.HasSlots = false
	}

	mu.Unlock()

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
			{URLs: []string{"stun:stun1.l.google.com:19302"}},
			{URLs: []string{"stun:stun2.l.google.com:19302"}},
			{URLs: []string{"stun:stun.voipbuster.com:3478"}},
			{URLs: []string{"stun:stun.ideasip.com"}},
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,
		BundlePolicy:       webrtc.BundlePolicyMaxBundle,
		RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,
		SDPSemantics:       webrtc.SDPSemanticsUnifiedPlan,
	}

	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("PeerConnection error for %s: %v", initData.Username, err)
		return
	}

	peer := &Peer{
		conn:     conn,
		pc:       peerConnection,
		username: initData.Username,
		room:     initData.Room,
		isLeader: initData.IsLeader,
	}

	mu.Lock()
	peers[initData.Username] = peer
	mu.Unlock()

	log.Printf("User '%s' joined room '%s' as %s", initData.Username, initData.Room, map[bool]string{true: "leader", false: "follower"}[initData.IsLeader])
	logStatus()
	sendRoomInfo(initData.Room)

	// Обработка входящих сообщений
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Connection closed by %s: %v", initData.Username, err)
			break
		}

		var data map[string]interface{}
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Printf("JSON error from %s: %v", initData.Username, err)
			continue
		}

		if sdp, ok := data["sdp"].(map[string]interface{}); ok {
			sdpType := sdp["type"].(string)
			sdpStr := sdp["sdp"].(string)

			log.Printf("SDP %s from %s (%s)\n%s",
				sdpType, initData.Username, initData.Room, sdpStr)

			// Анализ видео в SDP
			hasVideo := strings.Contains(sdpStr, "m=video")
			log.Printf("Video in SDP: %v", hasVideo)

			if !hasVideo && sdpType == "offer" {
				log.Printf("WARNING: Offer from %s contains no video!", initData.Username)
			}
		} else if ice, ok := data["ice"].(map[string]interface{}); ok {
			log.Printf("ICE from %s: %s:%v %s",
				initData.Username,
				ice["sdpMid"].(string),
				ice["sdpMLineIndex"].(float64),
				ice["candidate"].(string))
		}

		// Пересылка сообщения другим участникам комнаты
		mu.Lock()
		roomInfo := rooms[peer.room]
		if roomInfo != nil {
			for _, username := range roomInfo.Users {
				if username != peer.username {
					if p, ok := peers[username]; ok {
						if err := p.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
							log.Printf("Error sending to %s: %v", username, err)
						}
					}
				}
			}
		}
		mu.Unlock()
	}

	// Очистка при отключении
	mu.Lock()
	delete(peers, initData.Username)

	if roomInfo, exists := rooms[peer.room]; exists {
		// Удаляем пользователя из комнаты
		for i, username := range roomInfo.Users {
			if username == peer.username {
				roomInfo.Users = append(roomInfo.Users[:i], roomInfo.Users[i+1:]...)
				break
			}
		}

		// Если это был ведущий, удаляем всю комнату
		if peer.isLeader {
			delete(rooms, peer.room)
		} else {
			// Если это был ведомый, освобождаем слот
			roomInfo.HasSlots = true
		}
	}
	mu.Unlock()

	log.Printf("User '%s' left room '%s'", peer.username, peer.room)
	logStatus()
	sendRoomInfo(peer.room)
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		logStatus()
		w.Write([]byte("Status logged to console"))
	})

	log.Println("Server started on :8080")
	logStatus()
	log.Fatal(http.ListenAndServe(":8080", nil))
}