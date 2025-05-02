package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"strings" // Удален неиспользуемый импорт
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Разрешаем соединения с любых источников
}

// Peer представляет подключенного пользователя (ведущего или ведомого)
type Peer struct {
	conn     *websocket.Conn         // WebSocket соединение
	pc       *webrtc.PeerConnection  // WebRTC PeerConnection
	username string                  // Имя пользователя
	room     string                  // Комната, к которой подключен пользователь
	isLeader bool                    // true для Android (ведущий), false для браузера (ведомый)
	mu       sync.Mutex              // Мьютекс для защиты доступа к pc и conn из разных горутин
	lastActivity time.Time // Добавляем поле для отслеживания активности
}

// RoomInfo содержит информацию о комнате для отправки клиентам
type RoomInfo struct {
	Users    []string `json:"users"`    // Список имен пользователей в комнате
	Leader   string   `json:"leader"`   // Имя ведущего
	Follower string   `json:"follower"` // Имя ведомого
}

var (
	peers   = make(map[string]*Peer)             // Карта всех активных соединений (ключ - RemoteAddr)
	rooms   = make(map[string]map[string]*Peer) // Карта комнат (ключ - имя комнаты, значение - карта пиров в комнате по username)
	mu      sync.Mutex                           // Глобальный мьютекс для защиты доступа к peers и rooms
	letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
)

// Инициализация генератора случайных чисел
func init() {
	rand.Seed(time.Now().UnixNano())
}

// Генерация случайной строки (не используется в текущей логике, но может пригодиться)
func randSeq(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// getWebRTCConfig возвращает конфигурацию для WebRTC PeerConnection
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

// logStatus выводит текущее состояние сервера (количество соединений, комнат и их состав) в лог
func logStatus() {
	mu.Lock()
	defer mu.Unlock()

	log.Printf("--- Server Status ---")
	log.Printf("Total Connections: %d", len(peers))
	log.Printf("Active Rooms: %d", len(rooms))
	for room, roomPeers := range rooms {
		var leader, follower string
		users := []string{}
		for username, p := range roomPeers {
			users = append(users, username)
			if p.isLeader {
				leader = p.username
			} else {
				follower = p.username
			}
		}
		log.Printf("  Room '%s' (%d users: %v) - Leader: [%s], Follower: [%s]",
			room, len(roomPeers), users, leader, follower)
	}
	log.Printf("---------------------")
}

// getUsernames (не используется, но может быть полезна) возвращает список имен пользователей из карты пиров
func getUsernames(peers map[string]*Peer) []string {
	usernames := make([]string, 0, len(peers))
	for username := range peers {
		usernames = append(usernames, username)
	}
	return usernames
}

// sendRoomInfo отправляет актуальную информацию о составе комнаты всем ее участникам
func sendRoomInfo(room string) {
	mu.Lock()
	defer mu.Unlock() // Разблокируем мьютекс в конце функции

	if roomPeers, exists := rooms[room]; exists {
		var leader, follower string
		users := make([]string, 0, len(roomPeers))

		// Собираем информацию о комнате
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

		// Отправляем информацию каждому участнику комнаты
		for _, peer := range roomPeers {
			peer.mu.Lock() // Блокируем мьютекс пира перед использованием conn
			conn := peer.conn
			if conn != nil {
				log.Printf("Sending room_info to %s in room %s", peer.username, room)
				err := conn.WriteJSON(map[string]interface{}{
					"type": "room_info",
					"data": roomInfo,
				})
				if err != nil {
					// Используем WriteControl для отправки CloseMessage, если WriteJSON не удался
					// Это более надежный способ инициировать закрытие с ошибкой
					log.Printf("Error sending room info to %s (user: %s), attempting close: %v", conn.RemoteAddr(), peer.username, err)
					// Небольшая задержка перед отправкой CloseMessage
					time.Sleep(100 * time.Millisecond)
					conn.WriteControl(websocket.CloseMessage,
						websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Cannot send room info"),
						time.Now().Add(time.Second))
				}
			} else {
				log.Printf("Cannot send room info to %s, connection is nil", peer.username)
			}
			peer.mu.Unlock() // Разблокируем мьютекс пира
		}
	} else {
		log.Printf("Attempted to send room info for non-existent room '%s'", room)
	}
}

// closePeerConnection безопасно закрывает WebRTC и WebSocket соединения пира
func closePeerConnection(peer *Peer, reason string) {
    if peer == nil {
        return
    }
    peer.mu.Lock() // Блокируем мьютекс пира
    defer peer.mu.Unlock()

    // 1. Закрываем WebRTC соединение
    if peer.pc != nil {
        log.Printf("Closing PeerConnection for %s (Reason: %s)", peer.username, reason)

        // Останавливаем все отправители
        for _, sender := range peer.pc.GetSenders() {
            if sender.Track() != nil {
                sender.ReplaceTrack(nil)
            }
        }

        // Небольшая задержка перед закрытием
        time.Sleep(100 * time.Millisecond)
        if err := peer.pc.Close(); err != nil {
            log.Printf("Error closing peer connection for %s: %v", peer.username, err)
        }
        peer.pc = nil // Убираем ссылку
    }

    // 2. Закрываем WebSocket соединение
    if peer.conn != nil {
        log.Printf("Closing WebSocket connection for %s (Reason: %s)", peer.username, reason)
        // Отправляем сообщение о закрытии клиенту
        peer.conn.WriteControl(websocket.CloseMessage,
            websocket.FormatCloseMessage(websocket.CloseNormalClosure, reason),
            time.Now().Add(time.Second)) // Даем секунду на отправку
        // Закрываем соединение со стороны сервера
        peer.conn.Close()
        peer.conn = nil // Убираем ссылку
    }
}

// handlePeerJoin обрабатывает присоединение нового пользователя к комнате
// Возвращает созданный Peer или nil, если комната заполнена или произошла ошибка
func handlePeerJoin(room string, username string, isLeader bool, conn *websocket.Conn) (*Peer, error) {
    mu.Lock()
    defer mu.Unlock()

    if _, exists := rooms[room]; !exists {
        log.Printf("Creating new room: %s", room)
        rooms[room] = make(map[string]*Peer)
    }

    roomPeers := rooms[room]

    // --- Логика Замены Ведомого ---
    if !isLeader {
        var existingFollower *Peer = nil
        for _, p := range roomPeers {
            if !p.isLeader {
                existingFollower = p
                break
            }
        }

        if existingFollower != nil {
            log.Printf("Follower '%s' already exists in room '%s'. Disconnecting old follower to replace with new follower '%s'.",
                existingFollower.username, room, username)

            existingFollower.mu.Lock()
            if existingFollower.conn != nil {
                err := existingFollower.conn.WriteJSON(map[string]interface{}{
                    "type": "force_disconnect",
                    "data": "You have been replaced by another viewer.",
                })
                if err != nil {
                    log.Printf("Error sending force_disconnect to %s: %v", existingFollower.username, err)
                }
            }
            existingFollower.mu.Unlock()

            go closePeerConnection(existingFollower, "Replaced by new follower")
            delete(roomPeers, existingFollower.username)

            var oldAddr string
            for addr, p := range peers {
                if p == existingFollower {
                    oldAddr = addr
                    break
                }
            }
            if oldAddr != "" {
                delete(peers, oldAddr)
            } else if existingFollower.conn != nil {
                delete(peers, existingFollower.conn.RemoteAddr().String())
            }
            log.Printf("Old follower %s removed from room %s.", existingFollower.username, room)
        }
    }

    // --- Проверка Лимита Участников ---
    var currentLeaderCount, currentFollowerCount int
    for _, p := range roomPeers {
        if p.isLeader {
            currentLeaderCount++
        } else {
            currentFollowerCount++
        }
    }

    if isLeader && currentLeaderCount > 0 {
        log.Printf("Room '%s' already has a leader. Cannot add another leader '%s'.", room, username)
        conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room already has a leader"})
        conn.Close()
        return nil, nil
    }
    if !isLeader && currentFollowerCount > 0 {
        log.Printf("Room '%s' already has a follower. Cannot add another follower '%s'.", room, username)
        conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room already has a follower (should have been replaced)"})
        conn.Close()
        return nil, nil
    }
    if len(roomPeers) >= 2 && ((isLeader && currentLeaderCount == 0) || (!isLeader && currentFollowerCount == 0)) {
        log.Printf("Warning: Room '%s' has %d peers, but cannot add %s '%s'. LeaderCount: %d, FollowerCount: %d",
            room, len(roomPeers), map[bool]string{true: "leader", false: "follower"}[isLeader], username, currentLeaderCount, currentFollowerCount)
    }

    // --- Создание Нового PeerConnection ---
    log.Printf("Creating new PeerConnection for %s (isLeader: %v) in room %s", username, isLeader, room)
    peerConnection, err := webrtc.NewPeerConnection(getWebRTCConfig())
    if err != nil {
        log.Printf("Failed to create peer connection for %s: %v", username, err)
        return nil, err
    }

    peer := &Peer{
        conn:         conn,
        pc:           peerConnection,
        username:     username,
        room:         room,
        isLeader:     isLeader,
        lastActivity: time.Now(),
    }

    // Добавляем обработчик NegotiationNeeded
    peerConnection.OnNegotiationNeeded(func() {
        log.Printf("Negotiation needed for %s", peer.username)
        if peer.isLeader {
            go func() {
                peer.mu.Lock()
                defer peer.mu.Unlock()

                if peer.conn != nil {
                    err := peer.conn.WriteJSON(map[string]interface{}{
                        "type": "create_offer_for_new_follower",
                    })
                    if err != nil {
                        log.Printf("Error sending create_offer_for_new_follower to %s: %v", peer.username, err)
                    }
                }
            }()
        }
    })

    peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
        if c == nil {
            peer.mu.Lock()
            defer peer.mu.Unlock()
            if peer.conn != nil {
                peer.conn.WriteJSON(map[string]interface{}{
                    "type": "ice_complete",
                })
            }
            return
        }

        candidateJSON := c.ToJSON()
        if strings.Contains(candidateJSON.Candidate, "typ relay") ||
           !strings.Contains(candidateJSON.Candidate, "typ host") {
            peer.mu.Lock()
            if peer.conn != nil {
                err := peer.conn.WriteJSON(map[string]interface{}{
                    "type": "ice_candidate",
                    "ice":  candidateJSON,
                })
                if err != nil {
                    log.Printf("Error sending ICE candidate to %s: %v", peer.username, err)
                }
            }
            peer.mu.Unlock()
        }
    })

    peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
        log.Printf("Track received from %s: Type: %s, Codec: %s, SSRC: %d",
            peer.username, track.Kind(), track.Codec().MimeType, track.SSRC())
        go func() {
            buffer := make([]byte, 1500)
            for {
                _, _, readErr := track.Read(buffer)
                if readErr != nil {
                    return
                }
            }
        }()
    })

    peerConnection.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
        log.Printf("ICE Connection State changed for %s: %s", peer.username, state.String())
    })

    peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
        log.Printf("PeerConnection State changed for %s: %s", peer.username, s.String())
        if s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateClosed || s == webrtc.PeerConnectionStateDisconnected {
            log.Printf("PeerConnection state is %s for %s. Associated WebSocket likely closing soon.", s.String(), peer.username)
        }
    })

    // --- Добавление Пира в Комнату и Глобальный Список ---
    rooms[room][username] = peer
    peers[conn.RemoteAddr().String()] = peer
    log.Printf("Peer %s (isLeader: %v) added to room %s", username, isLeader, room)

    // --- Инициирование Нового Соединения ---
    if !isLeader {
        var leaderPeer *Peer = nil
        for _, p := range roomPeers {
            if p.isLeader {
                leaderPeer = p
                break
            }
        }

        if leaderPeer != nil {
            log.Printf("Requesting leader %s to create a NEW offer for the new follower %s", leaderPeer.username, peer.username)
            leaderPeer.mu.Lock()
            if leaderPeer.conn != nil {
                err := leaderPeer.conn.WriteJSON(map[string]interface{}{
                    "type":             "create_offer_for_new_follower",
                    "followerUsername": peer.username,
                })
                if err != nil {
                    log.Printf("Error sending 'create_offer_for_new_follower' to leader %s: %v", leaderPeer.username, err)
                }
            }
            leaderPeer.mu.Unlock()
        }
    } else {
        var followerPeer *Peer
        for _, p := range roomPeers {
            if !p.isLeader {
                followerPeer = p
                break
            }
        }
        if followerPeer != nil {
            log.Printf("Leader %s joined room %s where follower %s already exists. Requesting leader to create offer.", peer.username, room, followerPeer.username)
            peer.mu.Lock()
            if peer.conn != nil {
                err := peer.conn.WriteJSON(map[string]interface{}{
                    "type":             "create_offer_for_new_follower",
                    "followerUsername": followerPeer.username,
                })
                if err != nil {
                    log.Printf("Error sending 'create_offer_for_new_follower' to self (leader %s): %v", peer.username, err)
                }
            }
            peer.mu.Unlock()
        }
    }

    return peer, nil
}

// getLeader (вспомогательная функция) находит лидера в комнате
// Важно: Эта функция НЕ потокобезопасна сама по себе, использовать внутри блока mu.Lock()
func getLeader(room string) *Peer {
	if roomPeers, exists := rooms[room]; exists {
		for _, p := range roomPeers {
			if p.isLeader {
				return p
			}
		}
	}
	return nil
}

// getFollower (вспомогательная функция) находит ведомого в комнате
// Важно: Эта функция НЕ потокобезопасна сама по себе, использовать внутри блока mu.Lock()
func getFollower(room string) *Peer {
	if roomPeers, exists := rooms[room]; exists {
		for _, p := range roomPeers {
			if !p.isLeader {
				return p
			}
		}
	}
	return nil
}


func main() {
	http.HandleFunc("/ws", handleWebSocket) // Обработчик WebSocket соединений
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		logStatus() // Вывод статуса в лог по запросу /status
		w.Write([]byte("Status logged to console"))
	})

    // Запускаем очистку каждые 5 минут
    go func() {
        ticker := time.NewTicker(5 * time.Minute)
        for range ticker.C {
            cleanupInactivePeers()
            logStatus()
        }
    }()

	log.Println("Server starting on :8080")
	logStatus() // Начальный статус
	// Запуск HTTP сервера
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func cleanupInactivePeers() {
    mu.Lock()
    defer mu.Unlock()

    now := time.Now()
    for room, roomPeers := range rooms {
        for username, peer := range roomPeers {
            peer.mu.Lock()
            isAlive := peer.conn != nil && now.Sub(peer.lastActivity) < 2*time.Minute
            peer.mu.Unlock()

            if !isAlive {
                delete(roomPeers, username)
                log.Printf("Removed inactive peer %s from room %s", username, room)
                go closePeerConnection(peer, "Inactive peer cleanup")
            }
        }

        if len(roomPeers) == 0 {
            delete(rooms, room)
            log.Printf("Removed empty room %s", room)
        }
    }
}


func modifySDPForH264LowBitrate(msg []byte) []byte {
    var data map[string]interface{}
    if err := json.Unmarshal(msg, &data); err != nil {
        log.Printf("Error unmarshaling message for SDP modification: %v", err)
        return msg
    }

    if sdpData, ok := data["sdp"].(map[string]interface{}); ok {
        if sdpStr, ok := sdpData["sdp"].(string); ok {
            // Модифицируем SDP для H264 с низким битрейтом
            modifiedSDP := strings.ReplaceAll(sdpStr, "a=fmtp:126",
                "a=fmtp:126 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1;max-bitrate=500000")

            // Добавляем параметры битрейта
            modifiedSDP = strings.ReplaceAll(modifiedSDP, "a=rtpmap:126 H264/90000",
                "a=rtpmap:126 H264/90000\na=fmtp:126 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1;max-bitrate=500000")

            // Устанавливаем стартовый битрейт
            modifiedSDP += "b=AS:300\r\n" // 300 kbps

            sdpData["sdp"] = modifiedSDP
            data["sdp"] = sdpData

            modifiedMsg, err := json.Marshal(data)
            if err != nil {
                log.Printf("Error marshaling modified SDP: %v", err)
                return msg
            }
            return modifiedMsg
        }
    }
    return msg
}

// handleWebSocket обрабатывает входящие WebSocket соединения
func handleWebSocket(w http.ResponseWriter, r *http.Request) {


	// Обновляем HTTP соединение до WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	// Важно: закрываем соединение при выходе из функции (при ошибке или штатном завершении)
	// defer conn.Close() // Перенесли закрытие в логику очистки

	remoteAddr := conn.RemoteAddr().String()
	log.Printf("New WebSocket connection attempt from: %s", remoteAddr)

	// 1. Получаем инициализационные данные (комната, имя, роль)
	var initData struct {
		Room     string `json:"room"`
		Username string `json:"username"`
		IsLeader bool   `json:"isLeader"`
	}

	// Устанавливаем таймаут на чтение первого сообщения
	conn.SetReadDeadline(time.Now().Add(2 * time.Second)) // 2 секунд на отправку initData
	err = conn.ReadJSON(&initData)
	conn.SetReadDeadline(time.Time{}) // Сбрасываем таймаут после успешного чтения

	if err != nil {
		log.Printf("Read init data error from %s: %v. Closing connection.", remoteAddr, err)
		conn.Close() // Закрываем соединение, если не получили initData
		return
	}

	// Проверяем валидность данных
	if initData.Room == "" || initData.Username == "" {
		log.Printf("Invalid init data from %s: Room or Username is empty. Closing connection.", remoteAddr)
		conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room and Username cannot be empty"})
		conn.Close()
		return
	}

	log.Printf("User '%s' (isLeader: %v) attempting to join room '%s' from %s", initData.Username, initData.IsLeader, initData.Room, remoteAddr)

	// 2. Обрабатываем присоединение пира к комнате
	peer, err := handlePeerJoin(initData.Room, initData.Username, initData.IsLeader, conn)
	if err != nil {
		// Ошибка при создании PeerConnection на сервере
		log.Printf("Error handling peer join for %s: %v", initData.Username, err)
		conn.WriteJSON(map[string]interface{}{
			"type": "error",
			"data": "Server error joining room: " + err.Error(),
		})
		conn.Close() // Закрываем соединение при ошибке
		return
	}
	if peer == nil {
		// Пир не был создан (например, комната полна или роль уже занята)
		// Сообщение об ошибке уже отправлено внутри handlePeerJoin
		log.Printf("Peer %s was not created (room full or role taken?). Connection closed by handlePeerJoin.", initData.Username)
		// conn.Close() уже был вызван в handlePeerJoin в этом случае
		return
	}

	// Если пир успешно создан и добавлен
	log.Printf("User '%s' successfully joined room '%s' as %s", peer.username, peer.room, map[bool]string{true: "leader", false: "follower"}[peer.isLeader])
	logStatus()      // Обновляем статус сервера в логах
	sendRoomInfo(peer.room) // Отправляем всем в комнате обновленную информацию

	// 3. Цикл чтения сообщений от клиента
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			// Ошибка чтения или соединение закрыто клиентом
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure) {
				log.Printf("Unexpected WebSocket close error for %s: %v", peer.username, err)
			} else {
				log.Printf("WebSocket connection closed for %s (Reason: %v)", peer.username, err)
			}
			break // Выходим из цикла чтения
		}

        // Обновляем время последней активности
        peer.mu.Lock()
        peer.lastActivity = time.Now()
        peer.mu.Unlock()

		// Парсим полученное сообщение как JSON
		var data map[string]interface{}
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Printf("JSON unmarshal error from %s: %v (Message: %s)", peer.username, err, string(msg))
			continue // Пропускаем некорректное сообщение
		}

		// Логируем базовую информацию о сообщении
        msgType, ok := data["type"].(string)
        if !ok {
            // ДОБАВЬТЕ ЭТУ ПРОВЕРКУ:
            if action, ok := data["action"].(string); ok && action == "join" {
                room, _ := data["room"].(string)
                username, _ := data["username"].(string)
                isLeader, _ := data["isLeader"].(bool)

                log.Printf("Processing join from %s (room: %s, leader: %v)", username, room, isLeader)

                // Если это ведомый и уже есть другой ведомый - заменяем его
                if !isLeader {
                    mu.Lock()
                    if roomPeers, exists := rooms[room]; exists {
                        for _, p := range roomPeers {
                            if !p.isLeader {
                                // Отправляем команду на отключение старому ведомому
                                p.mu.Lock()
                                if p.conn != nil {
                                    p.conn.WriteJSON(map[string]interface{}{
                                        "type": "force_disconnect",
                                        "data": "Replaced by new viewer",
                                    })
                                }
                                p.mu.Unlock()
                                break
                            }
                        }
                    }
                    mu.Unlock()

                    // Отправляем подтверждение
                    conn.WriteJSON(map[string]interface{}{
                        "type": "join_ack",
                        "status": "processed",
                    })
                }
                continue
            }
            log.Printf("Received message without 'type' field from %s: %v", peer.username, data)
            continue
        }
		// log.Printf("Received '%s' message from %s", msgType, peer.username) // Логируем тип сообщения

		// --- Умная пересылка сообщений (SDP, ICE) ---
		// Блокируем глобальный мьютекс ТОЛЬКО для поиска другого пира
		mu.Lock()
		roomPeers := rooms[peer.room] // Получаем текущих пиров в комнате
		var targetPeer *Peer = nil
		if roomPeers != nil {
			for _, p := range roomPeers {
				if p.username != peer.username { // Ищем ДРУГОГО пира
					targetPeer = p
					break
				}
			}
		}
		mu.Unlock() // Разблокируем как можно скорее

		// Обработка сообщений в зависимости от типа
		switch msgType {
		case "offer":
			// Оффер всегда идет от Лидера к Ведомому
			if peer.isLeader {
                if peer.isLeader {
                    if targetPeer != nil && !targetPeer.isLeader {
                        // Модифицируем SDP для H264 и низкого битрейта
                        modifiedMsg := modifySDPForH264LowBitrate(msg)
                        log.Printf(">>> Forwarding modified OFFER from Leader %s to Follower %s", peer.username, targetPeer.username)

                        targetPeer.mu.Lock()
                        if targetPeer.conn != nil {
                            if err := targetPeer.conn.WriteMessage(websocket.TextMessage, modifiedMsg); err != nil {
                                log.Printf("!!! Error forwarding modified OFFER to %s: %v", targetPeer.username, err)
                            }
                        }
                        targetPeer.mu.Unlock()
                    }
                } else {
					log.Printf("WARN: Received 'offer' from leader %s, but no valid follower target found (targetPeer: %v). Ignoring.", peer.username, targetPeer)
				}
			} else {
				log.Printf("WARN: Received 'offer' from non-leader %s. Ignoring.", peer.username)
			}

		case "answer":
			// Ответ всегда идет от Ведомого к Лидеру
            if !peer.isLeader {
                if targetPeer != nil && targetPeer.isLeader {
                    // Модифицируем SDP для H264 и низкого битрейта
                    modifiedMsg := modifySDPForH264LowBitrate(msg)
                    log.Printf("<<< Forwarding modified ANSWER from Follower %s to Leader %s", peer.username, targetPeer.username)

                    targetPeer.mu.Lock()
                    if targetPeer.conn != nil {
                        if err := targetPeer.conn.WriteMessage(websocket.TextMessage, modifiedMsg); err != nil {
                            log.Printf("!!! Error forwarding modified ANSWER to %s: %v", targetPeer.username, err)
                        }
                    }
                    targetPeer.mu.Unlock()
                }
            } else {
				log.Printf("WARN: Received 'answer' from non-follower %s. Ignoring.", peer.username)
			}

		case "ice_candidate":
			// ICE кандидаты пересылаются другому пиру в комнате
			if targetPeer != nil {



			        if ice, iceOk := data["ice"].(map[string]interface{}); iceOk {
                        if candidate, candOk := ice["candidate"].(string); candOk {
                            // Пропускаем локальные (host) кандидаты если уже есть релейные
                            if strings.Contains(candidate, "typ relay") ||
                               !strings.Contains(candidate, "typ host") {
                                // Пересылаем только важные кандидаты
                                targetPeer.mu.Lock()
                                targetPeer.conn.WriteMessage(websocket.TextMessage, msg)
                                targetPeer.mu.Unlock()
                            }
                        }
                    } else {
					log.Printf("WARN: Received 'ice_candidate' from %s with invalid 'ice' field structure.", peer.username)
					break // Не пересылаем некорректный кандидат
				}


				targetPeer.mu.Lock() // Блокируем мьютекс целевого пира
				if targetPeer.conn != nil {
					if err := targetPeer.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						log.Printf("!!! Error forwarding ICE candidate to %s: %v", targetPeer.username, err)
					}
				} else {
					log.Printf("Cannot forward ICE candidate, target peer %s connection is nil.", targetPeer.username)
				}
				targetPeer.mu.Unlock() // Разблокируем мьютекс целевого пира
			} else {
				log.Printf("WARN: Received 'ice_candidate' from %s, but no target peer found in room %s. Ignoring.", peer.username, peer.room)
			}

		case "switch_camera":
			// Пересылаем сообщение о смене камеры другому участнику (вероятно, от лидера ведомому)
			log.Printf("Forwarding 'switch_camera' message from %s", peer.username)
			if targetPeer != nil {
				targetPeer.mu.Lock()
				if targetPeer.conn != nil {
					if err := targetPeer.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						log.Printf("Error forwarding switch_camera to %s: %v", targetPeer.username, err)
					}
				}
				targetPeer.mu.Unlock()
			}

		// --- Обработка серверных команд (если потребуются) ---
		// case "resend_offer": // Старая логика, заменена на create_offer_for_new_follower
		// 	log.Printf("WARN: Received deprecated 'resend_offer' from %s. Ignoring.", peer.username)
		// 	// Логика была здесь: сервер сам создавал и отправлял оффер от имени лидера - не очень хорошо.

		case "stop_receiving":
			// Сообщение от клиента, что он прекращает прием медиа. Серверу делать нечего.
			log.Printf("Received 'stop_receiving' from %s. No server action needed.", peer.username)
			continue // Просто продолжаем цикл

		default:
			log.Printf("Received unknown message type '%s' from %s. Ignoring.", msgType, peer.username)
		}
	}

	// 4. Очистка при завершении цикла (разрыв соединения или ошибка)
	log.Printf("Cleaning up resources for user '%s' in room '%s'", peer.username, peer.room)

	// Закрываем WebRTC и WebSocket соединения этого пира
	// Используем горутину, чтобы не блокировать основной поток handleWebSocket, если закрытие займет время
	go closePeerConnection(peer, "WebSocket connection closed")

	// Удаляем пира из комнаты и глобального списка
	mu.Lock()
	var remainingRoom string // Сохраняем имя комнаты для отправки обновления
	if peer != nil { // Добавлена проверка на nil для peer
		remainingRoom = peer.room
		if currentRoomPeers, roomExists := rooms[peer.room]; roomExists {
			delete(currentRoomPeers, peer.username) // Удаляем из комнаты
			log.Printf("Removed %s from room %s map.", peer.username, peer.room)
			// Если комната стала пустой, удаляем саму комнату
			if len(currentRoomPeers) == 0 {
				delete(rooms, peer.room)
				log.Printf("Room %s is now empty and has been deleted.", peer.room)
				remainingRoom = "" // Комнаты больше нет
			}
		}
		delete(peers, remoteAddr) // Удаляем из глобального списка по адресу
		log.Printf("Removed %s (addr: %s) from global peers map.", peer.username, remoteAddr)
	} else {
		log.Printf("WARN: Peer object was nil during cleanup for %s.", remoteAddr)
		delete(peers, remoteAddr) // Все равно удаляем из глобального списка по адресу
	}
	mu.Unlock()

	logStatus() // Логируем статус после очистки

	// Отправляем обновленную информацию оставшимся участникам комнаты (если комната еще существует)
	if remainingRoom != "" {
		sendRoomInfo(remainingRoom) // Используем сохраненное имя
	}
	log.Printf("Cleanup complete for connection %s.", remoteAddr) // Лог по адресу, т.к. peer может быть nil
} // Конец handleWebSocket