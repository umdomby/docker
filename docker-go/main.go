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
}

type RoomInfo struct {
	Users []string `json:"users"`
}

var (
	peers   = make(map[string]*Peer)
	rooms   = make(map[string]map[string]*Peer)
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
	for room, roomPeers := range rooms {
		log.Printf("Room '%s' (%d users): %v", room, len(roomPeers), getUsernames(roomPeers))
	}
}

func getUsernames(peers map[string]*Peer) []string {
	usernames := make([]string, 0, len(peers))
	for username := range peers {
		usernames = append(usernames, username)
	}
	return usernames
}

func sendRoomInfo(room string) {
	mu.Lock()
	defer mu.Unlock()

	if roomPeers, exists := rooms[room]; exists {
		users := getUsernames(roomPeers)
		roomInfo := RoomInfo{Users: users}

		for _, peer := range roomPeers {
			err := peer.conn.WriteJSON(map[string]interface{}{
				"type": "room_info",
				"data": roomInfo,
			})
			if err != nil {
				log.Printf("Error sending room info to %s: %v", peer.username, err)
			}
		}
	}
}

func cleanupPeer(peer *Peer, remoteAddr string) {
	mu.Lock()
	defer mu.Unlock()

	// Закрываем PeerConnection
	if peer.pc != nil {
		if err := peer.pc.Close(); err != nil {
			log.Printf("Error closing PeerConnection for %s: %v", peer.username, err)
		}
	}

	// Удаляем из комнаты
	delete(rooms[peer.room], peer.username)
	if len(rooms[peer.room]) == 0 {
		delete(rooms, peer.room)
	}

	// Удаляем из списка пиров
	delete(peers, remoteAddr)

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
	}
	if err := conn.ReadJSON(&initData); err != nil {
		log.Printf("Read init data error from %s: %v", remoteAddr, err)
		return
	}

	log.Printf("User '%s' joining room '%s'", initData.Username, initData.Room)

	mu.Lock()
	if roomPeers, exists := rooms[initData.Room]; exists {
		if _, userExists := roomPeers[initData.Username]; userExists {
			conn.WriteJSON(map[string]interface{}{
				"type": "error",
				"data": "Username already exists",
			})
			mu.Unlock()
			return
		}
	} else {
		rooms[initData.Room] = make(map[string]*Peer)
	}
	mu.Unlock()

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{
				"stun:stun.l.google.com:19302",
				"stun:stun1.l.google.com:19302",
				"stun:stun2.l.google.com:19302",
			}},
		},
	}

	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("PeerConnection error for %s: %v", initData.Username, err)
		conn.WriteJSON(map[string]interface{}{
			"type": "error",
			"data": "Failed to create peer connection",
		})
		return
	}

	peer := &Peer{
		conn:     conn,
		pc:       peerConnection,
		username: initData.Username,
		room:     initData.Room,
	}

	mu.Lock()
	rooms[initData.Room][initData.Username] = peer
	peers[remoteAddr] = peer
	mu.Unlock()

	// Обработчик закрытия соединения
	peerConnection.OnConnectionStateChange(func(pcs webrtc.PeerConnectionState) {
		log.Printf("PeerConnection state for %s: %s", peer.username, pcs.String())
		if pcs == webrtc.PeerConnectionStateDisconnected ||
		   pcs == webrtc.PeerConnectionStateFailed ||
		   pcs == webrtc.PeerConnectionStateClosed {
			cleanupPeer(peer, remoteAddr)
		}
	})

	log.Printf("User '%s' joined room '%s'", initData.Username, initData.Room)
	logStatus()
	sendRoomInfo(initData.Room)

	// Обработка входящих сообщений
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Connection closed by %s: %v", initData.Username, err)
			cleanupPeer(peer, remoteAddr)
			break
		}

		var data map[string]interface{}
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Printf("JSON error from %s: %v", initData.Username, err)
			continue
		}

		// Обработка SDP
		if sdp, ok := data["sdp"].(map[string]interface{}); ok {
			sdpType := sdp["type"].(string)
			sdpStr := sdp["sdp"].(string)

			log.Printf("SDP %s from %s (%s)", sdpType, initData.Username, initData.Room)

			// Проверка наличия видео в SDP
			hasVideo := strings.Contains(sdpStr, "m=video")
			log.Printf("Video in SDP: %v", hasVideo)

			if !hasVideo && sdpType == "offer" {
				log.Printf("WARNING: Offer from %s contains no video!", initData.Username)
			}
		}

		// Обработка ICE-кандидатов
		if ice, ok := data["ice"].(map[string]interface{}); ok {
			candidate := ice["candidate"].(string)
			if candidate == "" {
				continue // Пустые кандидаты игнорируем
			}

			log.Printf("ICE from %s: %s", initData.Username, candidate)
		}

		// Пересылка сообщения другим участникам комнаты
		mu.Lock()
		for username, p := range rooms[peer.room] {
			if username != peer.username {
				if err := p.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					log.Printf("Error sending to %s: %v", username, err)
					// Если ошибка при отправке, закрываем соединение
					p.conn.Close()
					cleanupPeer(p, p.conn.RemoteAddr().String())
				}
			}
		}
		mu.Unlock()
	}
}