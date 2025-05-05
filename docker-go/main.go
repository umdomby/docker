package main

import (
	"encoding/json"
	"errors" // <--- ДОБАВЛЕН ИМПОРТ
	"log"
	"math/rand"
	"net/http"
	// "strings" // Не нужен
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Разрешаем соединения с любых источников
}

// Peer представляет подключенного пользователя (ведущего или ведомого)
// Используем структуру из первой версии
type Peer struct {
	conn     *websocket.Conn
	pc       *webrtc.PeerConnection
	username string
	room     string
	isLeader bool
	mu       sync.Mutex // Мьютекс для защиты conn и pc
}

// RoomInfo содержит информацию о комнате для отправки клиентам
type RoomInfo struct {
	Users    []string `json:"users"`
	Leader   string   `json:"leader"`
	Follower string   `json:"follower"`
}

var (
	peers   = make(map[string]*Peer)             // Карта всех активных соединений (ключ - RemoteAddr)
	rooms   = make(map[string]map[string]*Peer) // Карта комнат (ключ - имя комнаты, значение - карта пиров в комнате по username)
	mu      sync.Mutex                           // Глобальный мьютекс для защиты peers и rooms
	letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
)

// Инициализация генератора случайных чисел
func init() {
	rand.Seed(time.Now().UnixNano())
}

// Генерация случайной строки (не используется)
func randSeq(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// Конфигурация WebRTC (используем стандартную из первой версии)
func getWebRTCConfig() webrtc.Configuration {
	return webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
            {
                URLs: []string{"stun:ardua.site:3478"},
            },
            {
                URLs:       []string{"turn:ardua.site:3478"},
                Username:   "user1",
                Credential: "pass1",
            },
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,
		BundlePolicy:       webrtc.BundlePolicyMaxBundle,
		RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,
		SDPSemantics:       webrtc.SDPSemanticsUnifiedPlan,
	}
}

// Логирование статуса (без изменений)
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

// Отправка информации о комнате (без изменений)
func sendRoomInfo(room string) {
	mu.Lock()
	defer mu.Unlock()

    roomPeers, exists := rooms[room]
    if !exists || roomPeers == nil {
        return
    }

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
			peer.mu.Lock()
			conn := peer.conn
			if conn != nil {
				// log.Printf("Sending room_info to %s in room %s", peer.username, room) // Можно раскомментировать для детального лога
				err := conn.WriteJSON(map[string]interface{}{
					"type": "room_info",
					"data": roomInfo,
				})
				if err != nil {
					log.Printf("Error sending room info to %s (user: %s), attempting close: %v", conn.RemoteAddr(), peer.username, err)
					time.Sleep(100 * time.Millisecond)
					conn.WriteControl(websocket.CloseMessage,
						websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Cannot send room info"),
						time.Now().Add(time.Second))
					// Не закрываем соединение здесь явно, позволяем read-циклу завершиться
				}
			}
			peer.mu.Unlock()
		}
	}
}

// Безопасное закрытие соединений пира (из первой версии)
func closePeerConnection(peer *Peer, reason string) {
	if peer == nil {
		return
	}
	peer.mu.Lock()
	defer peer.mu.Unlock()

	// Закрываем WebRTC
	if peer.pc != nil {
		log.Printf("Closing PeerConnection for %s (Reason: %s)", peer.username, reason)
		// Небольшая задержка может помочь отправить последние сообщения
		// time.Sleep(100 * time.Millisecond)
		if err := peer.pc.Close(); err != nil {
			// Игнорируем ошибку "invalid PeerConnection state", если уже закрывается
			// if !strings.Contains(err.Error(), "invalid PeerConnection state") {
			// 	log.Printf("Error closing peer connection for %s: %v", peer.username, err)
			// }
		}
		peer.pc = nil
	}

	// Закрываем WebSocket
	if peer.conn != nil {
		log.Printf("Closing WebSocket connection for %s (Reason: %s)", peer.username, reason)
		peer.conn.WriteControl(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, reason),
			time.Now().Add(time.Second))
		peer.conn.Close()
		peer.conn = nil
	}
}

// Обработка присоединения нового пользователя (ключевые изменения здесь)
func handlePeerJoin(room string, username string, isLeader bool, conn *websocket.Conn) (*Peer, error) {
    mu.Lock()
    defer mu.Unlock()

    // Инициализируем комнату, если ее нет
    if _, exists := rooms[room]; !exists {
        if !isLeader {
            conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room does not exist. Leader must join first."})
            conn.Close()
            return nil, errors.New("room does not exist for follower")
        }
        // Инициализируем мапу для новой комнаты
        rooms[room] = make(map[string]*Peer)
    }

    roomPeers := rooms[room]

    // Логика замены ведомого
    if !isLeader {
        // Проверяем что в комнате уже есть лидер
        hasLeader := false
        for _, p := range roomPeers {
            if p.isLeader {
                hasLeader = true
                break
            }
        }

        if !hasLeader {
            conn.WriteJSON(map[string]interface{}{"type": "error", "data": "No leader in room"})
            conn.Close()
            return nil, errors.New("no leader in room")
        }

        // Отключаем предыдущего ведомого, если он есть
        var existingFollower *Peer
        for _, p := range roomPeers {
            if !p.isLeader {
                existingFollower = p
                break
            }
        }

        if existingFollower != nil {
            log.Printf("Replacing old follower %s with new follower %s", existingFollower.username, username)

            // Отправляем команду на отключение старому ведомому
            existingFollower.mu.Lock()
            if existingFollower.conn != nil {
                existingFollower.conn.WriteJSON(map[string]interface{}{
                    "type": "force_disconnect",
                    "data": "You have been replaced by another viewer",
                })
            }
            existingFollower.mu.Unlock()

            // Удаляем старого ведомого
            delete(roomPeers, existingFollower.username)
            for addr, p := range peers {
                if p == existingFollower {
                    delete(peers, addr)
                    break
                }
            }
        }

        // Находим лидера и отправляем ему команду на переподключение
        var leaderPeer *Peer
        for _, p := range roomPeers {
            if p.isLeader {
                leaderPeer = p
                break
            }
        }

        if leaderPeer != nil {
            log.Printf("Sending rejoin command to leader %s", leaderPeer.username)
            leaderPeer.mu.Lock()
            leaderConn := leaderPeer.conn
            leaderPeer.mu.Unlock()

            if leaderConn != nil {
                err := leaderConn.WriteJSON(map[string]interface{}{
                    "type": "rejoin_and_offer",
                    "room": room,
                })
                if err != nil {
                    log.Printf("Error sending rejoin command to leader: %v", err)
                }
            }
        }
    }

    // Создаем PeerConnection
    peerConnection, err := webrtc.NewPeerConnection(getWebRTCConfig())
    if err != nil {
        return nil, err
    }

    peer := &Peer{
        conn:     conn,
        pc:       peerConnection,
        username: username,
        room:     room,
        isLeader: isLeader,
    }

    // Настройка обработчиков ICE кандидатов и треков
    peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
        if c == nil {
            return
        }

        peer.mu.Lock()
        defer peer.mu.Unlock()
        if peer.conn != nil {
            err := peer.conn.WriteJSON(map[string]interface{}{
                "type": "ice_candidate",
                "ice":  c.ToJSON(),
            })
            if err != nil {
                log.Printf("Error sending ICE candidate: %v", err)
            }
        }
    })

    peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
        log.Printf("Track received for %s in room %s: Type: %s, Codec: %s",
            peer.username, peer.room, track.Kind(), track.Codec().MimeType)
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

    // Добавляем пира в комнату
    rooms[room][username] = peer
    peers[conn.RemoteAddr().String()] = peer

    return peer, nil
}

// Главная функция (без изменений от первой версии)
func main() {
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		logStatus()
		w.Write([]byte("Status logged to console"))
	})

	log.Println("Server starting on :8080 (Logic: Leader Re-joins on Follower connect)")
	logStatus()
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// Обработчик WebSocket соединений (изменения в логике пересылки)
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade error:", err)
        return
    }
    remoteAddr := conn.RemoteAddr().String()
    log.Printf("New WebSocket connection attempt from: %s", remoteAddr)

    // --- Чтение первого сообщения для идентификации ---
    var initData struct {
        Room     string `json:"room"`
        Username string `json:"username"`
        IsLeader bool   `json:"isLeader"`
    }
    conn.SetReadDeadline(time.Now().Add(10 * time.Second))
    err = conn.ReadJSON(&initData)
    conn.SetReadDeadline(time.Time{}) // Сброс таймаута

    if err != nil {
        log.Printf("Read init data error from %s: %v. Closing.", remoteAddr, err)
        conn.Close()
        return
    }
    if initData.Room == "" || initData.Username == "" {
        log.Printf("Invalid init data from %s: Room or Username is empty. Closing.", remoteAddr)
        conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room and Username cannot be empty"})
        conn.Close()
        return
    }

    log.Printf("User '%s' (isLeader: %v) attempting to join room '%s' from %s", initData.Username, initData.IsLeader, initData.Room, remoteAddr)

    // --- Присоединение пира к комнате ---
    peer, err := handlePeerJoin(initData.Room, initData.Username, initData.IsLeader, conn)
    if err != nil {
        log.Printf("Error handling peer join for %s: %v", initData.Username, err)
        // Сообщение об ошибке и закрытие соединения уже произошли в handlePeerJoin
        return
    }
    if peer == nil {
        log.Printf("Peer %s was not created. Connection closed by handlePeerJoin.", initData.Username)
        return
    }

    // Успешное добавление пира
    log.Printf("User '%s' successfully joined room '%s' as %s", peer.username, peer.room, map[bool]string{true: "leader", false: "follower"}[peer.isLeader])
    logStatus()
    sendRoomInfo(peer.room) // Отправляем всем обновленную информацию

    // --- Цикл чтения сообщений от клиента ---
    for {
        msgType, msg, err := conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure) {
                log.Printf("Unexpected WebSocket close error for %s: %v", peer.username, err)
            } else {
                log.Printf("WebSocket connection closed for %s (Reason: %v)", peer.username, err)
            }
            break // Выходим из цикла чтения
        }

        // Обрабатываем только текстовые сообщения (JSON)
        if msgType != websocket.TextMessage {
            continue
        }

        // Проверяем что сообщение не пустое
        if len(msg) == 0 {
            log.Printf("Empty message from %s", peer.username)
            continue
        }

        // Парсим JSON
        var data map[string]interface{}
        if err := json.Unmarshal(msg, &data); err != nil {
            log.Printf("JSON unmarshal error from %s: %v", peer.username, err)
            continue
        }

        dataType, ok := data["type"].(string)
        if !ok || dataType == "" {
            log.Printf("Message without type from %s", peer.username)
            continue
        }

        // log.Printf("Received '%s' from %s", dataType, peer.username) // Детальный лог типа сообщения

        // --- Логика пересылки сообщений ---
        mu.Lock() // Блокируем для безопасного доступа к rooms
        roomPeers := rooms[peer.room]
        var targetPeer *Peer = nil
        if roomPeers != nil {
            for _, p := range roomPeers {
                if p.username != peer.username { // Находим другого пира в комнате
                    targetPeer = p
                    break
                }
            }
        }
        mu.Unlock() // Разблокируем как можно скорее

        // Пересылаем только если есть кому (targetPeer != nil)
        if targetPeer == nil {
            // log.Printf("No target peer found for message type '%s' from %s in room %s. Ignoring.", dataType, peer.username, peer.room)
            continue // Если второго участника нет, игнорируем сообщения сигнализации
        }

        // Пересылка конкретных типов сообщений нужному адресату
        switch dataType {
        case "offer":
            log.Printf("Received offer from %s: %s", peer.username, data["sdp"])
            // Оффер от Лидера -> Ведомому
            if peer.isLeader && !targetPeer.isLeader {
                log.Printf(">>> Forwarding Offer from %s to %s", peer.username, targetPeer.username)
                targetPeer.mu.Lock()
                conn := targetPeer.conn
                targetPeer.mu.Unlock()
                if conn != nil {
                    // Используем WriteMessage для отправки исходного байтового среза msg
                    if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                        log.Printf("!!! Error forwarding offer to %s: %v", targetPeer.username, err)
                    }
                }
            } else {
                log.Printf("WARN: Received 'offer' from unexpected peer %s (isLeader: %v) or target %s (isLeader: %v). Ignoring.",
                    peer.username, peer.isLeader, targetPeer.username, targetPeer.isLeader)
            }

        case "answer":
            // Ответ от Ведомого -> Лидеру
            if !peer.isLeader && targetPeer.isLeader {
                log.Printf("<<< Forwarding Answer from %s to %s", peer.username, targetPeer.username)
                targetPeer.mu.Lock()
                conn := targetPeer.conn
                targetPeer.mu.Unlock()
                if conn != nil {
                    // Используем WriteMessage для отправки исходного байтового среза msg
                    if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                        log.Printf("!!! Error forwarding answer to %s: %v", targetPeer.username, err)
                    }
                }
            } else {
                log.Printf("WARN: Received 'answer' from unexpected peer %s (isLeader: %v) or target %s (isLeader: %v). Ignoring.",
                    peer.username, peer.isLeader, targetPeer.username, targetPeer.isLeader)
            }

        case "ice_candidate":
            // Проверяем user-agent на iOS
            isIOS := strings.Contains(r.Header.Get("User-Agent"), "iPhone") ||
                     strings.Contains(r.Header.Get("User-Agent"), "iPad")

            if isIOS {
                // Для iOS фильтруем кандидаты перед пересылкой
                if strings.Contains(message["ice"].(map[string]interface{})["candidate"].(string), "typ relay") ||
                   strings.Contains(message["ice"].(map[string]interface{})["candidate"].(string), "typ srflx") {
                    targetPeer.mu.Lock()
                    conn := targetPeer.conn
                    targetPeer.mu.Unlock()
                    if conn != nil {
                        if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                            log.Printf("Error forwarding ICE candidate to %s: %v", targetPeer.username, err)
                        }
                    }
                }
            } else {
                // Для других платформ пересылаем как есть
                targetPeer.mu.Lock()
                conn := targetPeer.conn
                targetPeer.mu.Unlock()
                if conn != nil {
                    if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                        log.Printf("Error forwarding ICE candidate to %s: %v", targetPeer.username, err)
                    }
                }
            }
            // ICE кандидаты -> Другому участнику
            // log.Printf("... Forwarding ICE candidate from %s to %s", peer.username, targetPeer.username) // Можно добавить для отладки
            targetPeer.mu.Lock()
            conn := targetPeer.conn
            targetPeer.mu.Unlock()
            if conn != nil {
                // Используем WriteMessage для отправки исходного байтового среза msg
                if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                    // log.Printf("!!! Error forwarding ICE candidate to %s: %v", targetPeer.username, err) // Лог ошибки
                }
            }

        case "switch_camera":
            // Любые другие типы сообщений, которые нужно просто переслать
            log.Printf("Forwarding '%s' message from %s to %s", dataType, peer.username, targetPeer.username)
            targetPeer.mu.Lock()
            conn := targetPeer.conn
            targetPeer.mu.Unlock()
            if conn != nil {
                // Используем WriteMessage для отправки исходного байтового среза msg
                if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                    log.Printf("Error forwarding '%s' to %s: %v", dataType, targetPeer.username, err)
                }
            }

        default:
            log.Printf("Ignoring message with unknown type '%s' from %s", dataType, peer.username)
        }
    }

    // --- Очистка после завершения цикла чтения ---
    log.Printf("Cleaning up resources for disconnected user '%s' in room '%s'", peer.username, peer.room)

    // Запускаем закрытие соединений в горутине
    go closePeerConnection(peer, "WebSocket connection closed")

    // Удаляем пира из комнаты и глобального списка
    mu.Lock()
    roomName := peer.room // Сохраняем имя комнаты
    if currentRoomPeers, roomExists := rooms[roomName]; roomExists {
        delete(currentRoomPeers, peer.username)
        log.Printf("Removed %s from room %s map.", peer.username, roomName)
        if len(currentRoomPeers) == 0 {
            delete(rooms, roomName)
            log.Printf("Room %s is now empty and deleted.", roomName)
            roomName = "" // Комнаты больше нет для отправки room_info
        }
    }
    delete(peers, remoteAddr)
    log.Printf("Removed %s (addr: %s) from global peers map.", peer.username, remoteAddr)
    mu.Unlock()

    logStatus() // Логируем статус после очистки

    // Отправляем обновленную информацию оставшимся в комнате
    if roomName != "" {
        sendRoomInfo(roomName)
    }
    log.Printf("Cleanup complete for connection %s.", remoteAddr)
} // Конец handleWebSocket