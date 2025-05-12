package main

import (
    "encoding/json"
"errors"
"fmt"
"log"
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
    isLeader bool
    mu       sync.Mutex
}

type RoomInfo struct {
    Users    []string `json:"users"`
    Leader   string   `json:"leader"`
    Follower string   `json:"follower"`
}

var (
peers     = make(map[string]*Peer)
rooms     = make(map[string]map[string]*Peer)
mu        sync.Mutex
// letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") // Не используется, но оставлено для вашего сведения
webrtcAPI *webrtc.API // Глобальный API с настроенным MediaEngine
)

func init() {
// rand.Seed(time.Now().UnixNano()) // Закомментировано, т.к. randSeq не используется. Если будете использовать math/rand, раскомментируйте.
    initializeMediaAPI() // Инициализируем MediaEngine при старте
}

// initializeMediaAPI настраивает MediaEngine только с H.264 и Opus
func initializeMediaAPI() {
    mediaEngine := &webrtc.MediaEngine{}

    // Регистрируем только H.264 с конкретными параметрами
    if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
        RTPCodecCapability: webrtc.RTPCodecCapability{
            MimeType:    webrtc.MimeTypeH264,
            ClockRate:   90000,
            SDPFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
            RTCPFeedback: []webrtc.RTCPFeedback{
                {Type: "nack"},
                {Type: "nack", Parameter: "pli"},
                {Type: "ccm", Parameter: "fir"},
                {Type: "goog-remb"},
            },
        },
        PayloadType: 126,
    }, webrtc.RTPCodecTypeVideo); err != nil {
        panic(fmt.Sprintf("H264 codec registration error: %v", err))
    }

    // Регистрируем Opus аудио
    if err := mediaEngine.RegisterCodec(webrtc.RTPCodecParameters{
        RTPCodecCapability: webrtc.RTPCodecCapability{
            MimeType:     webrtc.MimeTypeOpus,
            ClockRate:    48000,
            Channels:     2,
            SDPFmtpLine:  "minptime=10;useinbandfec=1",
            RTCPFeedback: []webrtc.RTCPFeedback{},
        },
        PayloadType: 111,
    }, webrtc.RTPCodecTypeAudio); err != nil {
        panic(fmt.Sprintf("Opus codec registration error: %v", err))
    }

    // Создаем API с нашими настройками
    webrtcAPI = webrtc.NewAPI(
        webrtc.WithMediaEngine(mediaEngine),
    )
    log.Println("MediaEngine initialized with H.264 (video) and Opus (audio) only")
}

// getWebRTCConfig осталась вашей функцией
func getWebRTCConfig() webrtc.Configuration {
    return webrtc.Configuration{
        ICEServers: []webrtc.ICEServer{
            {URLs: []string{"stun:ardua.site:3478"}},
            {URLs: []string{"turn:ardua.site:3478"}, Username: "user1", Credential: "pass1"}
        },
        ICETransportPolicy: webrtc.ICETransportPolicyAll,
            BundlePolicy:       webrtc.BundlePolicyMaxBundle,
            RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,
            SDPSemantics:       webrtc.SDPSemanticsUnifiedPlan,
    }
}

// logStatus осталась вашей функцией
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

// sendRoomInfo осталась вашей функцией
func sendRoomInfo(room string) {
    mu.Lock()
    defer mu.Unlock()

    roomPeers, exists := rooms[room]
    if !exists || roomPeers == nil {
        return
    }

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

    roomInfo := RoomInfo{Users: users, Leader: leader, Follower: follower}
    for _, peer := range roomPeers {
        peer.mu.Lock()
        conn := peer.conn
        if conn != nil {
            err := conn.WriteJSON(map[string]interface{}{"type": "room_info", "data": roomInfo})
            if err != nil {
                log.Printf("Error sending room info to %s (user: %s): %v", conn.RemoteAddr(), peer.username, err)
            }
        }
        peer.mu.Unlock()
    }
}

// closePeerResources - унифицированная функция для закрытия ресурсов пира
func closePeerResources(peer *Peer, reason string) {
    if peer == nil {
        return
    }
    peer.mu.Lock() // Блокируем конкретного пира

    // Сначала закрываем WebRTC соединение
    if peer.pc != nil {
        log.Printf("Closing PeerConnection for %s (Reason: %s)", peer.username, reason)
        // Небольшая задержка может иногда помочь отправить последние данные, но обычно не нужна
        // time.Sleep(100 * time.Millisecond)
        if err := peer.pc.Close(); err != nil {
            // Ошибки типа "invalid PeerConnection state" ожидаемы, если соединение уже закрывается
            // log.Printf("Error closing peer connection for %s: %v", peer.username, err)
        }
        peer.pc = nil // Помечаем как закрытое
    }

    // Затем закрываем WebSocket соединение
    if peer.conn != nil {
        log.Printf("Closing WebSocket connection for %s (Reason: %s)", peer.username, reason)
        // Отправляем управляющее сообщение о закрытии, если возможно
        _ = peer.conn.WriteControl(websocket.CloseMessage,
            websocket.FormatCloseMessage(websocket.CloseNormalClosure, reason),
            time.Now().Add(time.Second)) // Даем немного времени на отправку
        peer.conn.Close()
        peer.conn = nil // Помечаем как закрытое
    }
    peer.mu.Unlock()
}

// handlePeerJoin осталась вашей функцией с изменениями для создания PeerConnection через webrtcAPI
func handlePeerJoin(room string, username string, isLeader bool, conn *websocket.Conn) (*Peer, error) {
    mu.Lock() // Блокируем для работы с глобальными комнатами

    if _, exists := rooms[room]; !exists {
        if !isLeader {
            mu.Unlock()
            _ = conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room does not exist. Leader must join first."})
            conn.Close()
            return nil, errors.New("room does not exist for follower")
        }
        rooms[room] = make(map[string]*Peer)
    }

    roomPeers := rooms[room] // Получаем ссылку на мапу пиров комнаты

    // Логика замены ведомого (ваша логика)
    if !isLeader {
        hasLeader := false
        for _, p := range roomPeers {
            if p.isLeader {
                hasLeader = true
                break
            }
        }
        if !hasLeader {
            mu.Unlock()
            _ = conn.WriteJSON(map[string]interface{}{"type": "error", "data": "No leader in room"})
            conn.Close()
            return nil, errors.New("no leader in room")
        }

        var existingFollower *Peer
        for _, p := range roomPeers {
            if !p.isLeader { // Ищем существующего ведомого
                existingFollower = p
                break
            }
        }

        if existingFollower != nil {
            log.Printf("Replacing old follower %s with new follower %s in room %s", existingFollower.username, username, room)
            // Удаляем старого ведомого из комнаты и глобального списка peers
            delete(roomPeers, existingFollower.username)
            for addr, pItem := range peers {
                if pItem == existingFollower {
                    delete(peers, addr)
                    break
                }
            }
            // Важно: разблокировать глобальный мьютекс перед тем, как делать что-то с existingFollower.conn,
            // чтобы избежать дедлока, если existingFollower.mu попытается заблокироваться,
            // а другой поток держит глобальный mu и ждет existingFollower.mu
            mu.Unlock()
            // Отправляем команду на отключение и закрываем ресурсы старого ведомого
            existingFollower.mu.Lock()
            if existingFollower.conn != nil {
                _ = existingFollower.conn.WriteJSON(map[string]interface{}{
                    "type": "force_disconnect",
                        "data": "You have been replaced by another viewer",
                })
            }
            existingFollower.mu.Unlock()
            go closePeerResources(existingFollower, "Replaced by new follower")
            mu.Lock() // Снова блокируем для дальнейшей работы
        }

        var leaderPeer *Peer
        for _, p := range roomPeers {
            if p.isLeader {
                leaderPeer = p
                break
            }
        }
        if leaderPeer != nil {
            log.Printf("Sending rejoin_and_offer command to leader %s for new follower %s", leaderPeer.username, username)
            leaderPeer.mu.Lock() // Блокируем лидера для безопасного доступа к его conn
            leaderWsConn := leaderPeer.conn
            leaderPeer.mu.Unlock() // Разблокируем лидера

            if leaderWsConn != nil {
                // Разблокируем глобальный мьютекс перед отправкой по WebSocket
                mu.Unlock()
                err := leaderWsConn.WriteJSON(map[string]interface{}{"type": "rejoin_and_offer", "room": room})
                mu.Lock() // Снова блокируем
                if err != nil {
                    log.Printf("Error sending rejoin_and_offer command to leader %s: %v", leaderPeer.username, err)
                }
            } else {
                log.Printf("Leader %s has no active WebSocket connection to send rejoin_and_offer.", leaderPeer.username)
            }
        } else {
            log.Printf("No leader found in room %s to send rejoin_and_offer.", room)
        }
    }

    // ИСПОЛЬЗУЕМ webrtcAPI для создания PeerConnection
    peerConnection, err := webrtcAPI.NewPeerConnection(getWebRTCConfig())
    if err != nil {
        mu.Unlock()
        return nil, fmt.Errorf("failed to create PeerConnection: %w", err)
    }
    log.Printf("PeerConnection created for %s using H.264/Opus MediaEngine.", username)

    peer := &Peer{
        conn:     conn,
        pc:       peerConnection,
        username: username,
        room:     room,
        isLeader: isLeader,
    }

    if isLeader {
        // Для лидера (Android) добавляем трансиверы
        if _, err := peerConnection.AddTransceiverFromKind(webrtc.RTPCodecTypeVideo, webrtc.RTPTransceiverInit{
            Direction: webrtc.RTPTransceiverDirectionSendonly,
        }); err != nil {
            log.Printf("Failed to add video transceiver for leader %s: %v", username, err)
        }
    } else {
        // Для ведомого (браузера) добавляем приемный трансивер
        if _, err := peerConnection.AddTransceiverFromKind(webrtc.RTPCodecTypeVideo, webrtc.RTPTransceiverInit{
            Direction: webrtc.RTPTransceiverDirectionRecvonly,
        }); err != nil {
            log.Printf("Failed to add video transceiver for follower %s: %v", username, err)
        }
    }

    if _, err := peerConnection.AddTransceiverFromKind(webrtc.RTPCodecTypeAudio, webrtc.RTPTransceiverInit{
        Direction: webrtc.RTPTransceiverDirectionSendrecv,
    }); err != nil {
        log.Printf("Failed to add audio transceiver for %s: %v", username, err)
    }

    // Настройка обработчиков ICE кандидатов и треков (ваша логика)
    peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
        if c == nil {
            return
        }
        peer.mu.Lock()
        defer peer.mu.Unlock()
        if peer.conn != nil {
            // log.Printf("Sending ICE candidate from %s: %s", peer.username, c.ToJSON().Candidate)
            err := peer.conn.WriteJSON(map[string]interface{}{"type": "ice_candidate", "ice": c.ToJSON()})
            if err != nil {
                log.Printf("Error sending ICE candidate to %s: %v", peer.username, err)
            }
        }
    })

    // OnTrack обычно для отвечающей стороны (ведомого), чтобы получать треки.
    // Лидер (Android) сам добавляет треки, серверу их слушать не обязательно, если он просто ретранслятор.
    if !isLeader {
        peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
            log.Printf("Track received for follower %s in room %s: Codec %s",
                peer.username, peer.room, track.Codec().MimeType)
            // Для простого ретранслятора этот трек не нужно обрабатывать на сервере,
            // Pion автоматически перенаправит его другому пиру, если настроены трансиверы.
            // В вашем случае, браузер (ведомый) будет получать трек от Android (лидера).
            // Этот колбек полезен для отладки.
            // Чтобы избежать утечек, можно запустить "пожиратель" данных трека, если трек не используется:
            // go func() {
            // 	buffer := make([]byte, 1500)
            // 	for {
            // 		_, _, readErr := track.Read(buffer)
            // 		if readErr != nil {
            // 			return
            // 		}
            // 	}
            // }()
        })
    }

    rooms[room][username] = peer
    peers[conn.RemoteAddr().String()] = peer
    mu.Unlock() // Разблокируем глобальный мьютекс

    return peer, nil
}

// main осталась вашей функцией
func main() {
// initializeMediaAPI() // Уже вызывается в init()

    http.HandleFunc("/wsgo", handleWebSocket)
    http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
        logStatus()
        w.WriteHeader(http.StatusOK)
        if _, err := w.Write([]byte("Status logged to console")); err != nil {
            log.Printf("Error writing /status response: %v", err)
        }
    })

    log.Println("Server starting on :8085 (Logic: Leader Re-joins on Follower connect)")
    log.Println("WebRTC MediaEngine configured for H.264 (video) and Opus (audio).")
    logStatus() // Логируем статус при запуске
    if err := http.ListenAndServe(":8085", nil); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}

// handleWebSocket осталась вашей функцией с минимальными изменениями для очистки
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade error:", err)
        return
    }
    remoteAddr := conn.RemoteAddr().String()
    log.Printf("New WebSocket connection attempt from: %s", remoteAddr)

    var initData struct {
        Room     string `json:"room"`
        Username string `json:"username"`
        IsLeader bool   `json:"isLeader"`
    }
    conn.SetReadDeadline(time.Now().Add(10 * time.Second))
    err = conn.ReadJSON(&initData)
    conn.SetReadDeadline(time.Time{})

    if err != nil {
        log.Printf("Read init data error from %s: %v. Closing.", remoteAddr, err)
        conn.Close()
        return
    }
    if initData.Room == "" || initData.Username == "" {
        log.Printf("Invalid init data from %s: Room or Username is empty. Closing.", remoteAddr)
        _ = conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room and Username cannot be empty"})
        conn.Close()
        return
    }

    log.Printf("User '%s' (isLeader: %v) attempting to join room '%s' from %s", initData.Username, initData.IsLeader, initData.Room, remoteAddr)

    currentPeer, err := handlePeerJoin(initData.Room, initData.Username, initData.IsLeader, conn)
    if err != nil {
        log.Printf("Error handling peer join for %s: %v", initData.Username, err)
        return
    }
    if currentPeer == nil {
        log.Printf("Peer %s was not created. Connection likely closed by handlePeerJoin.", initData.Username)
        return
    }

    log.Printf("User '%s' successfully joined room '%s' as %s", currentPeer.username, currentPeer.room, map[bool]string{true: "leader", false: "follower"}[currentPeer.isLeader])
    logStatus()
    sendRoomInfo(currentPeer.room)

    // Цикл чтения сообщений от клиента (ваша логика)
    for {
        msgType, msgBytes, err := conn.ReadMessage() // Читаем как байты, чтобы пересылать без изменений
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
                log.Printf("Unexpected WebSocket close error for %s (%s): %v", currentPeer.username, remoteAddr, err)
            } else { // Более общее логгирование для остальных ошибок/закрытий
                log.Printf("WebSocket connection closed/read error for %s (%s): %v", currentPeer.username, remoteAddr, err)
            }
            break
        }

        if msgType != websocket.TextMessage {
            log.Printf("Received non-text message type (%d) from %s. Ignoring.", msgType, currentPeer.username)
            continue
        }
        if len(msgBytes) == 0 {
            // log.Printf("Empty message from %s", currentPeer.username) // Могут быть keep-alive пинги
            continue
        }

        // Парсим JSON только для определения типа и логгирования, но пересылаем исходные байты
        var data map[string]interface{}
        // Необязательно анмаршалить, если мы просто пересылаем. Но для логгирования типа это полезно.
        if err := json.Unmarshal(msgBytes, &data); err != nil {
            log.Printf("JSON unmarshal error (for logging type) from %s: %v. Message: %s. Forwarding raw.", currentPeer.username, err, string(msgBytes))
            // Все равно пытаемся переслать, если это критичное сообщение
        }
        dataType, _ := data["type"].(string)


        mu.Lock()
        roomPeers := rooms[currentPeer.room]
        var targetPeer *Peer
        if roomPeers != nil {
            for _, p := range roomPeers {
                if p.username != currentPeer.username {
                    targetPeer = p
                    break
                }
            }
        }
        mu.Unlock()

        if targetPeer == nil && (dataType == "offer" || dataType == "answer" || dataType == "ice_candidate") {
            // log.Printf("No target peer in room %s for signaling message '%s' from %s. Ignoring.", currentPeer.room, dataType, currentPeer.username)
            continue
        }

        // Логика пересылки сообщений (ваша логика)
        // Важно: пересылаем исходные msgBytes, а не перекодированный data
        switch dataType {
            case "offer":
                // log.Printf("Received offer from %s: %s", currentPeer.username, string(msgBytes)) // Лог SDP может быть большим
                if currentPeer.isLeader && targetPeer != nil && !targetPeer.isLeader {
                    // log.Printf(">>> Forwarding Offer from %s to %s", currentPeer.username, targetPeer.username)
                    targetPeer.mu.Lock()
                    targetWsConn := targetPeer.conn
                    targetPeer.mu.Unlock()
                    if targetWsConn != nil {
                        if err := targetWsConn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
                            log.Printf("!!! Error forwarding offer to %s: %v", targetPeer.username, err)
                        }
                    }
                } // else { log.Printf("WARN: Received 'offer' from non-leader or no target.")}

            case "answer":
                if targetPeer != nil && !currentPeer.isLeader && targetPeer.isLeader {
                    // log.Printf("<<< Forwarding Answer from %s to %s", currentPeer.username, targetPeer.username)
                    targetPeer.mu.Lock()
                    targetWsConn := targetPeer.conn
                    targetPeer.mu.Unlock()
                    if targetWsConn != nil {
                        if err := targetWsConn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
                            log.Printf("!!! Error forwarding answer to %s: %v", targetPeer.username, err)
                        }
                    }
                } // else { log.Printf("WARN: Received 'answer' from non-follower or no target leader.")}

            case "ice_candidate":
                if targetPeer != nil {
                    // log.Printf("... Forwarding ICE candidate from %s to %s", currentPeer.username, targetPeer.username)
                    targetPeer.mu.Lock()
                    targetWsConn := targetPeer.conn
                    targetPeer.mu.Unlock()
                    if targetWsConn != nil {
                        if err := targetWsConn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
                            // log.Printf("!!! Error forwarding ICE candidate to %s: %v", targetPeer.username, err)
                        }
                    }
                }

            case "switch_camera": // Ваше пользовательское сообщение
                if targetPeer != nil {
                    log.Printf("Forwarding '%s' message from %s to %s", dataType, currentPeer.username, targetPeer.username)
                    targetPeer.mu.Lock()
                    targetWsConn := targetPeer.conn
                    targetPeer.mu.Unlock()
                    if targetWsConn != nil {
                        if err := targetWsConn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
                            log.Printf("Error forwarding '%s' to %s: %v", dataType, targetPeer.username, err)
                        }
                    }
                }
            default:
            // log.Printf("Ignoring message with type '%s' from %s", dataType, currentPeer.username)
        }
    }

    // Очистка после завершения цикла чтения
    log.Printf("Cleaning up for %s (Addr: %s) in room %s after WebSocket loop ended.", currentPeer.username, remoteAddr, currentPeer.room)
    go closePeerResources(currentPeer, "WebSocket read loop ended") // Используем унифицированную функцию

    mu.Lock()
    roomName := currentPeer.room // Сохраняем имя комнаты для sendRoomInfo
    if currentRoomPeers, roomExists := rooms[roomName]; roomExists {
        delete(currentRoomPeers, currentPeer.username)
        if len(currentRoomPeers) == 0 {
            delete(rooms, roomName)
            log.Printf("Room %s is now empty and has been deleted.", roomName)
            roomName = "" // Устанавливаем в "", чтобы не вызывать sendRoomInfo для удаленной комнаты
        }
    }
    delete(peers, remoteAddr) // Удаляем из глобального списка
    mu.Unlock()

    logStatus()
    if roomName != "" { // Отправляем room_info, только если комната еще существует
        sendRoomInfo(roomName)
    }
    log.Printf("Cleanup complete for WebSocket connection %s (User: %s)", remoteAddr, currentPeer.username)
}