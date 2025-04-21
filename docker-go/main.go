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

type Room struct {
	Peers       map[string]*Peer
	LeaderOffer *webrtc.SessionDescription
}

type Peer struct {
	conn     *websocket.Conn
	pc       *webrtc.PeerConnection
	username string
	room     string
	isLeader bool
	mu       sync.Mutex
}

type RoomInfo struct {
	Users    []string `json:"users"`
	Leader   string   `json:"leader"`
	HasSlave bool     `json:"hasSlave"`
}

var (
	peers   = make(map[string]*Peer)
	rooms   = make(map[string]*Room)
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
	for roomName, room := range rooms {
		log.Printf("Room '%s' (%d users): %v", roomName, len(room.Peers), getUsernames(room.Peers))
	}
}

func getUsernames(peers map[string]*Peer) []string {
	usernames := make([]string, 0, len(peers))
	for username := range peers {
		usernames = append(usernames, username)
	}
	return usernames
}

func sendRoomInfo(roomName string) {
	mu.Lock()
	defer mu.Unlock()

	if room, exists := rooms[roomName]; exists {
		users := getUsernames(room.Peers)
		var leader string
		hasSlave := false

		for _, peer := range room.Peers {
			if peer.isLeader {
				leader = peer.username
			} else {
				hasSlave = true
			}
		}

		roomInfo := RoomInfo{
			Users:    users,
			Leader:   leader,
			HasSlave: hasSlave,
		}

		for _, peer := range room.Peers {
			peer.mu.Lock()
			err := peer.conn.WriteJSON(map[string]interface{}{
				"type": "room_info",
				"data": roomInfo,
			})
			peer.mu.Unlock()
			if err != nil {
				log.Printf("Error sending room info to %s: %v", peer.username, err)
			}
		}
	}
}

func cleanupRoom(roomName string) {
	mu.Lock()
	defer mu.Unlock()

	if room, exists := rooms[roomName]; exists {
		for _, peer := range room.Peers {
			peer.mu.Lock()
			if peer.pc != nil {
				peer.pc.Close()
			}
			if peer.conn != nil {
				peer.conn.Close()
			}
			delete(peers, peer.conn.RemoteAddr().String())
			peer.mu.Unlock()
		}
		delete(rooms, roomName)
		log.Printf("Room %s cleaned up", roomName)
	}
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

	// Настройка ping-pong обработчиков
	conn.SetPingHandler(func(message string) error {
		log.Printf("Ping from %s", conn.RemoteAddr())
		return conn.WriteControl(websocket.PongMessage, []byte(message), time.Now().Add(5*time.Second))
	})

	conn.SetPongHandler(func(message string) error {
		log.Printf("Pong from %s", conn.RemoteAddr())
		return nil
	})

	remoteAddr := conn.RemoteAddr().String()
	log.Printf("New connection from: %s", remoteAddr)

	var initData struct {
		Room     string `json:"room"`
		Username string `json:"username"`
		IsLeader bool   `json:"isLeader"`
	}
	if err := conn.ReadJSON(&initData); err != nil {
		log.Printf("Read init data error from %s: %v", remoteAddr, err)
		return
	}

	log.Printf("User '%s' joining room '%s' as %s", initData.Username, initData.Room, map[bool]string{true: "leader", false: "slave"}[initData.IsLeader])

	mu.Lock()
	if room, exists := rooms[initData.Room]; exists {
		var leaderExists, slaveExists bool
		for _, peer := range room.Peers {
			if peer.isLeader {
				leaderExists = true
			} else {
				slaveExists = true
			}
		}

		if !initData.IsLeader {
			if room.LeaderOffer != nil {
				conn.WriteJSON(map[string]interface{}{
					"type": "offer",
					"sdp": map[string]interface{}{
						"type": room.LeaderOffer.Type.String(),
						"sdp":  room.LeaderOffer.SDP,
					},
				})
			}
		}

		if initData.IsLeader && leaderExists {
			mu.Unlock()
			conn.WriteJSON(map[string]interface{}{
				"type": "error",
				"data": "Room already has leader",
			})
			conn.Close()
			return
		}

		if !initData.IsLeader && slaveExists {
			mu.Unlock()
			conn.WriteJSON(map[string]interface{}{
				"type": "notification",
				"data": "Room already has slave",
			})
			conn.Close()
			return
		}
	} else {
		if !initData.IsLeader {
			mu.Unlock()
			conn.WriteJSON(map[string]interface{}{
				"type": "notification",
				"data": "Room does not exist",
			})
			conn.Close()
			return
		}
		rooms[initData.Room] = &Room{
			Peers: make(map[string]*Peer),
		}
	}
	mu.Unlock()

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
			{URLs: []string{"stun:stun1.l.google.com:19302"}},
			{URLs: []string{"stun:stun2.l.google.com:19302"}},
			{URLs: []string{"stun:stun3.l.google.com:19302"}},
			{URLs: []string{"stun:stun4.l.google.com:19302"}},
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
	rooms[initData.Room].Peers[initData.Username] = peer
	peers[remoteAddr] = peer
	mu.Unlock()

	log.Printf("User '%s' joined room '%s'", initData.Username, initData.Room)
	logStatus()
	sendRoomInfo(initData.Room)

	// Отправка ping каждые 15 секунд
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				peer.mu.Lock()
				if peer.conn != nil {
					if err := peer.conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(5*time.Second)); err != nil {
						log.Printf("Ping error to %s: %v", peer.username, err)
						peer.mu.Unlock()
						return
					}
				}
				peer.mu.Unlock()
			}
		}
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Connection closed by %s: %v", initData.Username, err)

			mu.Lock()
			delete(peers, remoteAddr)
			if room, exists := rooms[peer.room]; exists {
				delete(room.Peers, peer.username)
				if peer.isLeader || len(room.Peers) == 0 {
					cleanupRoom(peer.room)
				} else {
					sendRoomInfo(peer.room)
				}
			}
			mu.Unlock()
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

			hasVideo := strings.Contains(sdpStr, "m=video")
			log.Printf("Video in SDP: %v", hasVideo)

			if !hasVideo && sdpType == "offer" {
				log.Printf("WARNING: Offer from %s contains no video!", initData.Username)
			}

			if sdpType == "offer" && initData.IsLeader {
				mu.Lock()
				rooms[initData.Room].LeaderOffer = &webrtc.SessionDescription{
					Type: webrtc.SDPTypeOffer,
					SDP:  sdpStr,
				}
				mu.Unlock()
			}
		} else if ice, ok := data["ice"].(map[string]interface{}); ok {
			log.Printf("ICE from %s: %s:%v %s",
				initData.Username,
				ice["sdpMid"].(string),
				ice["sdpMLineIndex"].(float64),
				ice["candidate"].(string))
		}

		mu.Lock()
		if room, exists := rooms[peer.room]; exists {
			for username, p := range room.Peers {
				if username != peer.username {
					p.mu.Lock()
					if err := p.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						log.Printf("Error sending to %s: %v", username, err)
					}
					p.mu.Unlock()
				}
			}
		}
		mu.Unlock()
	}

	mu.Lock()
	delete(peers, remoteAddr)
	if room, exists := rooms[peer.room]; exists {
		delete(room.Peers, peer.username)
		if peer.isLeader || len(room.Peers) == 0 {
			cleanupRoom(peer.room)
		} else {
			sendRoomInfo(peer.room)
		}
	}
	mu.Unlock()

	log.Printf("User '%s' left room '%s'", peer.username, peer.room)
	logStatus()
}