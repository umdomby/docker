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
	isLeader bool // true для Android (ведущий), false для браузера (ведомый)
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
                URLs:       []string{"turn:ardua.site:3478", "turns:ardua.site:5349"},
                Username:   "user1",
                Credential: "pass1",
            },
            {URLs: []string{"stun:stun.l.google.com:19301"}},
            {URLs: []string{"stun:stun.l.google.com:19302"}},
            {URLs: []string{"stun:stun.l.google.com:19303"}},
            {URLs: []string{"stun:stun.l.google.com:19304"}},
            {URLs: []string{"stun:stun.l.google.com:19305"}},
            {URLs: []string{"stun:stun1.l.google.com:19301"}},
            {URLs: []string{"stun:stun1.l.google.com:19302"}},
            {URLs: []string{"stun:stun1.l.google.com:19303"}},
            {URLs: []string{"stun:stun1.l.google.com:19304"}},
            {URLs: []string{"stun:stun1.l.google.com:19305"}},
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

func handlePeerJoin(room string, username string, isLeader bool, conn *websocket.Conn) (*Peer, error) {
    mu.Lock()
    defer mu.Unlock()

    if _, exists := rooms[room]; !exists {
        rooms[room] = make(map[string]*Peer)
    }

    roomPeers := rooms[room]

    // Ищем существующего ведомого для замены
    var existingFollower *Peer
    for _, p := range roomPeers {
        if !isLeader && !p.isLeader {
            existingFollower = p
            break
        }
    }

    // Если нашли ведомого для замены
    if existingFollower != nil {
        log.Printf("Replacing follower %s with new follower %s", existingFollower.username, username)

        // Отправляем команду на отключение
        existingFollower.conn.WriteJSON(map[string]interface{}{
            "type": "force_disconnect",
            "data": "You have been replaced by another viewer",
        })

        // Закрываем соединения
        if existingFollower.pc != nil {
            existingFollower.pc.Close()
        }
        existingFollower.conn.Close()

        // Удаляем из комнаты
        delete(roomPeers, existingFollower.username)
        delete(peers, existingFollower.conn.RemoteAddr().String())
    }

    // Проверяем лимит участников
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

    // Добавляем обработчики ICE кандидатов
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

    // Добавляем обработчик входящих потоков
    peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
        log.Printf("Track received: %s", track.Kind().String())
    })

    // Добавляем обработчик изменения состояния ICE соединения
    //     peerConnection.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
    //         log.Printf("ICE Connection State changed: %s", state.String())
    //     })

    peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
        log.Printf("PeerConnection state changed: %s", s.String())
        if s == webrtc.PeerConnectionStateFailed {
            // 1. Закрываем проблемное соединение
            if peerConnection != nil {
                peerConnection.Close()
            }

            // 2. Уведомляем клиента о необходимости переподключения
            if conn != nil {
                conn.WriteJSON(map[string]interface{}{
                    "type": "reconnect_request",
                    "reason": "connection_failed",
                })
            }

            // 3. Логируем инцидент
            log.Printf("Connection failed for user %s in room %s", username, room)
        }
    })

    rooms[room][username] = peer
    peers[conn.RemoteAddr().String()] = peer

    // Если это новый ведомый и есть ведущий - запрашиваем новый offer
    if !isLeader {
        if leader := getLeader(room); leader != nil {
            leader.conn.WriteJSON(map[string]interface{}{
                "type": "resend_offer",
            })
        }
    }

    return peer, nil
}

func getLeader(room string) *Peer {
    for _, p := range rooms[room] {
        if p.isLeader {
            return p
        }
    }
    return nil
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
		} else if ice, ok := data["ice"].(map[string]interface{}); ok {
			log.Printf("ICE from %s: %s:%v %s",
				initData.Username,
				ice["sdpMid"].(string),
				ice["sdpMLineIndex"].(float64),
				ice["candidate"].(string))
		}

    switch data["type"].(string) {
    case "resend_offer":
        // Логика повторной отправки offer от ведущего
        if peer.isLeader {
            // Создаем и отправляем новое offer
            offer, err := peer.pc.CreateOffer(nil)
            if err != nil {
                log.Printf("CreateOffer error: %v", err)
                continue
            }

            peer.pc.SetLocalDescription(offer)
            for _, p := range rooms[peer.room] {
                if !p.isLeader {
                    p.conn.WriteJSON(map[string]interface{}{
                        "type": "offer",
                        "sdp":  offer,
                    })
                }
            }
        }
    case "stop_receiving":
        // На клиенте должно быть обработано закрытие медиапотока
        continue
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

	// Очистка при отключении
	mu.Lock()
	delete(peers, remoteAddr)
	delete(rooms[peer.room], peer.username)
	if len(rooms[peer.room]) == 0 {
		delete(rooms, peer.room)
	}
	mu.Unlock()

	log.Printf("User '%s' left room '%s'", peer.username, peer.room)
	logStatus()
	sendRoomInfo(peer.room)
}