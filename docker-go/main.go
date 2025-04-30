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
	isLeader bool
}

type RoomInfo struct {
	Users    []string `json:"users"`
	Leader   string   `json:"leader"`
	Follower string   `json:"follower"`
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

func getWebRTCConfig() webrtc.Configuration {
	return webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs:       []string{"turn:ardua.site:3478"},
				Username:   "user1",
				Credential: "pass1",
			},
			{URLs: []string{"stun:ardua.site:3478"}},
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,
		BundlePolicy:       webrtc.BundlePolicyMaxBundle,
		RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,
		SDPSemantics:       webrtc.SDPSemanticsUnifiedPlan,
	}
}

func logStatus() {
	mu.Lock()
	defer mu.Unlock()

	log.Printf("Status - Connections: %d, Rooms: %d", len(peers), len(rooms))
	for room, roomPeers := range rooms {
		var leader, follower string
		for _, p := range roomPeers {
			if p.isLeader {
				leader = p.username
			} else {
				follower = p.username
			}
		}
		log.Printf("Room '%s' - Leader: %s, Follower: %s", room, leader, follower)
	}
}

func sendRoomInfo(room string) {
	mu.Lock()
	defer mu.Unlock()

	if roomPeers, exists := rooms[room]; exists {
		var leader, follower string
		users := make([]string, 0, len(roomPeers))

		for _, peer := range roomPeers {
			users = append(users, peer.username)
			if peer.isLeader {
				leader = peer.username
			} else {
				follower = peer.username
			}
		}

		roomInfo := RoomInfo{
			Users:    users,
			Leader:   leader,
			Follower: follower,
		}

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

func cleanupPeer(peer *Peer) {
	if peer == nil {
		return
	}

	if peer.pc != nil {
		peer.pc.Close()
	}
	if peer.conn != nil {
		peer.conn.Close()
	}

	mu.Lock()
	defer mu.Unlock()

	// Удаляем из комнаты
	if roomPeers, exists := rooms[peer.room]; exists {
		delete(roomPeers, peer.username)
		if len(roomPeers) == 0 {
			delete(rooms, peer.room)
		}
	}

	// Удаляем из общего списка пиров
	delete(peers, peer.conn.RemoteAddr().String())
}

func handlePeerJoin(room string, username string, isLeader bool, conn *websocket.Conn) (*Peer, error) {
	mu.Lock()
	defer mu.Unlock()

	if _, exists := rooms[room]; !exists {
		rooms[room] = make(map[string]*Peer)
	}

	roomPeers := rooms[room]

	// Если это ведущий, удаляем предыдущего ведущего
	if isLeader {
		for _, p := range roomPeers {
			if p.isLeader {
				log.Printf("Replacing leader %s with new leader %s", p.username, username)
				// Отправляем сообщение о принудительном отключении
				p.conn.WriteJSON(map[string]interface{}{
					"type": "force_disconnect",
					"data": "Replaced by new leader",
				})
				cleanupPeer(p)
				break
			}
		}
	} else {
		// Если это ведомый, удаляем предыдущего ведомого
		for _, p := range roomPeers {
			if !p.isLeader {
				log.Printf("Replacing follower %s with new follower %s", p.username, username)
				// Отправляем сообщение о принудительном отключении
				p.conn.WriteJSON(map[string]interface{}{
					"type": "force_disconnect",
					"data": "Replaced by new viewer",
				})
				cleanupPeer(p)
				break
			}
		}
	}

	// Проверяем лимит участников (2 - ведущий и ведомый)
	if len(roomPeers) >= 2 {
		return nil, nil
	}

	// Создаем новое PeerConnection
	peerConnection, err := webrtc.NewPeerConnection(getWebRTCConfig())
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		return nil, err
	}

	peer := &Peer{
		conn:     conn,
		pc:       peerConnection,
		username: username,
		room:     room,
		isLeader: isLeader,
	}

	// Обработчики событий WebRTC
	peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}

		candidate := c.ToJSON()
		conn.WriteJSON(map[string]interface{}{
			"type": "ice_candidate",
			"ice":  candidate,
		})
	})

	peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("Track received: %s", track.Kind().String())
	})

	peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
		log.Printf("PeerConnection state changed: %s", s.String())
		if s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateClosed {
			log.Printf("Cleaning up peer %s due to connection state %s", peer.username, s.String())
			cleanupPeer(peer)
			sendRoomInfo(room)
		}
	})

	rooms[room][username] = peer
	peers[conn.RemoteAddr().String()] = peer

	return peer, nil
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
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in handleWebSocket: %v", r)
		}
	}()

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

	log.Printf("User '%s' (isLeader: %v) joining room '%s'", initData.Username, initData.IsLeader, initData.Room)

	peer, err := handlePeerJoin(initData.Room, initData.Username, initData.IsLeader, conn)
	if err != nil {
		conn.WriteJSON(map[string]interface{}{
			"type": "error",
			"data": "Failed to join room",
		})
		return
	}
	if peer == nil {
		conn.WriteJSON(map[string]interface{}{
			"type": "error",
			"data": "Room is full",
		})
		return
	}

	log.Printf("User '%s' joined room '%s' as %s", initData.Username, initData.Room, map[bool]string{true: "leader", false: "follower"}[initData.IsLeader])
	logStatus()
	sendRoomInfo(initData.Room)

	// Обработка входящих сообщений
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Connection closed by %s: %v", initData.Username, err)
			cleanupPeer(peer)
			sendRoomInfo(initData.Room)
			break
		}

		var data map[string]interface{}
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Printf("JSON error from %s: %v", initData.Username, err)
			continue
		}

		// Безопасная обработка типа сообщения
		msgType, ok := data["type"].(string)
		if !ok {
			log.Printf("Invalid message type from %s", initData.Username)
			continue
		}

		switch msgType {
		case "sdp":
			if sdp, ok := data["sdp"].(map[string]interface{}); ok {
				sdpType, _ := sdp["type"].(string)
				sdpStr, _ := sdp["sdp"].(string)

				log.Printf("SDP %s from %s (%s)\n%s",
					sdpType, initData.Username, initData.Room, sdpStr)

				hasVideo := strings.Contains(sdpStr, "m=video")
				log.Printf("Video in SDP: %v", hasVideo)
			}

		case "ice_candidate":
			if ice, ok := data["ice"].(map[string]interface{}); ok {
				sdpMid, _ := ice["sdpMid"].(string)
				sdpMLineIndex, _ := ice["sdpMLineIndex"].(float64)
				candidate, _ := ice["candidate"].(string)

				log.Printf("ICE from %s: %s:%v %s",
					initData.Username, sdpMid, sdpMLineIndex, candidate)
			}

		case "switch_camera":
			mu.Lock()
			for _, p := range rooms[peer.room] {
				if p.username != peer.username {
					if err := p.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						log.Printf("Error sending to %s: %v", p.username, err)
					}
				}
			}
			mu.Unlock()

		case "resend_offer":
			if peer.isLeader {
				offer, err := peer.pc.CreateOffer(nil)
				if err != nil {
					log.Printf("CreateOffer error: %v", err)
					continue
				}

				if err := peer.pc.SetLocalDescription(offer); err != nil {
					log.Printf("SetLocalDescription error: %v", err)
					continue
				}

				mu.Lock()
				for _, p := range rooms[peer.room] {
					if !p.isLeader {
						p.conn.WriteJSON(map[string]interface{}{
							"type": "offer",
							"sdp":  offer,
						})
					}
				}
				mu.Unlock()
			}
		}

		// Пересылка сообщения другому участнику комнаты
		mu.Lock()
		for username, p := range rooms[peer.room] {
			if username != peer.username {
				if err := p.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					log.Printf("Error sending to %s: %v", username, err)
				}
			}
		}
		mu.Unlock()
	}
}