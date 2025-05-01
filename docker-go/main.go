package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	// "strings" // Удален неиспользуемый импорт
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
				URLs:       []string{"turn:ardua.site:3478"}, // TURN сервер для обхода сложных NAT
				Username:   "user1",
				Credential: "pass1",
			},
			{URLs: []string{"stun:ardua.site:3478"}}, // STUN сервер для определения внешнего IP
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,       // Пытаться использовать все виды ICE кандидатов (host, srflx, relay)
		BundlePolicy:       webrtc.BundlePolicyMaxBundle,     // Собирать все медиа потоки в один транспортный поток
		RTCPMuxPolicy:      webrtc.RTCPMuxPolicyRequire,      // Требовать мультиплексирование RTP и RTCP
		SDPSemantics:       webrtc.SDPSemanticsUnifiedPlan, // Использовать современный стандарт описания сессий SDP
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
		// Небольшая задержка перед закрытием, чтобы дать время на отправку последних сообщений
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
	mu.Lock() // Блокируем глобальный мьютекс для работы с rooms и peers
	defer mu.Unlock()

	if _, exists := rooms[room]; !exists {
		log.Printf("Creating new room: %s", room)
		rooms[room] = make(map[string]*Peer)
	}

	roomPeers := rooms[room]

	// --- Логика Замены Ведомого ---
	// Если новый участник - ведомый (!isLeader)
	if !isLeader {
		var existingFollower *Peer = nil
		// var leaderPeer *Peer = nil // Удалено: Не используется в этом блоке

		// Ищем существующего ведомого в комнате
		for _, p := range roomPeers {
			if !p.isLeader {
				existingFollower = p // Нашли существующего ведомого
				break // Нам нужен только один
			}
			// if p.isLeader { // Удалено: Не используется в этом блоке
			// 	leaderPeer = p
			// }
		}

		// Если существующий ведомый найден, отключаем его
		if existingFollower != nil {
			log.Printf("Follower '%s' already exists in room '%s'. Disconnecting old follower to replace with new follower '%s'.", existingFollower.username, room, username)

			// 1. Отправляем команду на отключение старому ведомому
			existingFollower.mu.Lock() // Блокируем мьютекс старого ведомого
			if existingFollower.conn != nil {
				err := existingFollower.conn.WriteJSON(map[string]interface{}{
					"type": "force_disconnect",
					"data": "You have been replaced by another viewer.",
				})
				if err != nil {
					log.Printf("Error sending force_disconnect to %s: %v", existingFollower.username, err)
				}
			}
			existingFollower.mu.Unlock() // Разблокируем мьютекс старого ведомого

			// 2. Закрываем соединения старого ведомого (WebRTC и WebSocket)
			// Используем отдельную функцию для безопасного закрытия
			go closePeerConnection(existingFollower, "Replaced by new follower")

			// 3. Удаляем старого ведомого из комнаты и глобального списка пиров
			delete(roomPeers, existingFollower.username)
			// Удаляем из глобального списка peers по адресу соединения старого ведомого
			// Важно: нужно найти правильный ключ (адрес)
			var oldAddr string
			for addr, p := range peers { // Ищем адрес старого ведомого в глобальной карте
				if p == existingFollower {
					oldAddr = addr
					break
				}
			}
			if oldAddr != "" {
				delete(peers, oldAddr)
			} else {
				log.Printf("WARN: Could not find old follower %s in global peers map by object comparison.", existingFollower.username)
				// Попробуем удалить по адресу из соединения, если оно еще не nil
				if existingFollower.conn != nil {
					 delete(peers, existingFollower.conn.RemoteAddr().String())
				}
			}

			log.Printf("Old follower %s removed from room %s.", existingFollower.username, room)

			// Важно: После удаления старого ведомого, комната готова принять нового.
			// Продолжаем выполнение функции для добавления нового ведомого.
		}
	}

	// --- Проверка Лимита Участников ---
	// После потенциального удаления старого ведомого, снова проверяем размер комнаты
	var currentLeaderCount, currentFollowerCount int
	for _, p := range roomPeers {
		if p.isLeader {
			currentLeaderCount++
		} else {
			currentFollowerCount++
		}
	}

	// Проверяем, можно ли добавить нового участника
	if isLeader && currentLeaderCount > 0 {
		log.Printf("Room '%s' already has a leader. Cannot add another leader '%s'.", room, username)
		conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room already has a leader"})
		conn.Close()
		return nil, nil // Возвращаем nil, nil чтобы показать, что пир не был создан, но ошибки для сервера нет
	}
	if !isLeader && currentFollowerCount > 0 {
		// Эта проверка может быть излишней из-за логики замены выше, но оставим для надежности
		log.Printf("Room '%s' already has a follower. Cannot add another follower '%s'.", room, username)
		conn.WriteJSON(map[string]interface{}{"type": "error", "data": "Room already has a follower (should have been replaced)"})
		conn.Close()
		return nil, nil
	}
	if len(roomPeers) >= 2 && ( (isLeader && currentLeaderCount == 0) || (!isLeader && currentFollowerCount == 0) ){
         // Если мест < 2, но слот лидера/фолловера занят - это ошибка логики или гонка состояний
        log.Printf("Warning: Room '%s' has %d peers, but cannot add %s '%s'. LeaderCount: %d, FollowerCount: %d", room, len(roomPeers), map[bool]string{true: "leader", false: "follower"}[isLeader], username, currentLeaderCount, currentFollowerCount)
        // Продолжаем, т.к. предыдущие проверки должны были обработать это.
    }


	// --- Создание Нового PeerConnection ---
	// Каждый раз создаем НОВЫЙ PeerConnection для нового участника ИЛИ при переподключении
	log.Printf("Creating new PeerConnection for %s (isLeader: %v) in room %s", username, isLeader, room)
	peerConnection, err := webrtc.NewPeerConnection(getWebRTCConfig())
	if err != nil {
		log.Printf("Failed to create peer connection for %s: %v", username, err)
		return nil, err // Возвращаем ошибку, если PeerConnection не создан
	}

	peer := &Peer{
		conn:     conn,
		pc:       peerConnection,
		username: username,
		room:     room,
		isLeader: isLeader,
	}

	// --- Настройка Обработчиков PeerConnection ---

	// Обработчик для ICE кандидатов: отправляем кандидата другому пиру через WebSocket
	peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			log.Printf("ICE candidate gathering complete for %s", peer.username)
			return
		}

		candidateJSON := c.ToJSON()
		log.Printf("Generated ICE candidate for %s: %s", peer.username, candidateJSON.Candidate)

		peer.mu.Lock() // Блокируем мьютекс пира перед использованием conn
		if peer.conn != nil {
			// Отправляем кандидата напрямую клиенту, который его сгенерировал
			err := peer.conn.WriteJSON(map[string]interface{}{
				"type": "ice_candidate", // Тип сообщения для клиента
				"ice":  candidateJSON,    // Сам кандидат
			})
			if err != nil {
				log.Printf("Error sending ICE candidate to %s: %v", peer.username, err)
			}
		} else {
			log.Printf("Cannot send ICE candidate, connection for %s is nil.", peer.username)
		}
		peer.mu.Unlock() // Разблокируем мьютекс пира
	})

	// Обработчик входящих медиа-треков (в основном для отладки на сервере)
	peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("Track received from %s: Type: %s, Codec: %s, SSRC: %d",
			peer.username, track.Kind(), track.Codec().MimeType, track.SSRC())
		// На сервере мы не обрабатываем медиа, просто логируем
		// Можно было бы сделать пересылку треков, но это сложнее и не требуется заданием
		// Просто читаем пакеты, чтобы избежать накопления буфера (рекомендация pion)
		go func() {
			buffer := make([]byte, 1500)
			for {
				_, _, readErr := track.Read(buffer)
				if readErr != nil {
					// Логгируем только если это не ожидаемое закрытие соединения
					// if readErr != io.EOF && !strings.Contains(readErr.Error(), "use of closed network connection") {
					// log.Printf("Track read error for %s (%s): %v", peer.username, track.Kind(), readErr)
					// }
					// Упрощенное логирование для уменьшения шума
					// log.Printf("Track read ended for %s (%s): %v", peer.username, track.Kind(), readErr)
					return
				}
			}
		}()
	})

	// Обработчик изменения состояния ICE соединения
	peerConnection.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("ICE Connection State changed for %s: %s", peer.username, state.String())
		// Можно добавить логику реакции на failed/disconnected
	})

	// Обработчик изменения общего состояния PeerConnection
	peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
		log.Printf("PeerConnection State changed for %s: %s", peer.username, s.String())
		// Если соединение разорвано или не удалось, инициируем очистку
		if s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateClosed || s == webrtc.PeerConnectionStateDisconnected {
			log.Printf("PeerConnection state is %s for %s. Associated WebSocket likely closing soon.", s.String(), peer.username)
			// Основная очистка инициируется при закрытии WebSocket в handleWebSocket
		}
	})

	// --- Добавление Пира в Комнату и Глобальный Список ---
	rooms[room][username] = peer
	peers[conn.RemoteAddr().String()] = peer
	log.Printf("Peer %s (isLeader: %v) added to room %s", username, isLeader, room)

	// --- Инициирование Нового Соединения ---
	// **Ключевое изменение:** Вместо простого "resend_offer", мы явно просим лидера
	// создать НОВЫЙ оффер для ТОЛЬКО ЧТО подключившегося ведомого.
	// Это гарантирует "чистый старт" для WebRTC сессии при каждом подключении/переподключении ведомого.
	if !isLeader { // Если подключился ведомый
		// Ищем лидера в этой комнате (теперь ищем здесь)
		var leaderPeer *Peer = nil
		for _, p := range roomPeers {
			if p.isLeader {
				leaderPeer = p
				break
			}
		}

		if leaderPeer != nil {
			log.Printf("Requesting leader %s to create a NEW offer for the new follower %s", leaderPeer.username, peer.username)
			leaderPeer.mu.Lock() // Блокируем мьютекс лидера
			if leaderPeer.conn != nil {
				err := leaderPeer.conn.WriteJSON(map[string]interface{}{
					// Новый, более конкретный тип сообщения для лидера
					"type":             "create_offer_for_new_follower",
					"followerUsername": peer.username, // Можно передать имя ведомого, если лидеру нужно знать
				})
				if err != nil {
					log.Printf("Error sending 'create_offer_for_new_follower' to leader %s: %v", leaderPeer.username, err)
				}
			} else {
				log.Printf("Cannot send 'create_offer_for_new_follower', leader %s connection is nil", leaderPeer.username)
			}
			leaderPeer.mu.Unlock() // Разблокируем мьютекс лидера
		} else {
			log.Printf("Follower %s joined room %s, but no leader found yet to initiate offer.", peer.username, room)
		}
	} else {
		// Если подключился лидер, а ведомый УЖЕ есть (маловероятно при текущей логике, но возможно)
		var followerPeer *Peer
		for _, p := range roomPeers {
			if !p.isLeader {
				followerPeer = p
				break
			}
		}
		if followerPeer != nil {
			log.Printf("Leader %s joined room %s where follower %s already exists. Requesting leader to create offer.", peer.username, room, followerPeer.username)
			// Лидер сам должен будет инициировать оффер при подключении,
			// но можно и явно попросить для надежности.
			peer.mu.Lock()
			if peer.conn != nil {
				err := peer.conn.WriteJSON(map[string]interface{}{
					"type":             "create_offer_for_new_follower", // Используем тот же тип
					"followerUsername": followerPeer.username,
				})
				if err != nil {
					log.Printf("Error sending 'create_offer_for_new_follower' to self (leader %s): %v", peer.username, err)
				}
			}
			peer.mu.Unlock()
		}
	}


	return peer, nil // Возвращаем успешно созданный пир
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

	log.Println("Server starting on :8080")
	logStatus() // Начальный статус
	// Запуск HTTP сервера
	log.Fatal(http.ListenAndServe(":8080", nil))
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
	conn.SetReadDeadline(time.Now().Add(10 * time.Second)) // 10 секунд на отправку initData
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

		// Парсим полученное сообщение как JSON
		var data map[string]interface{}
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Printf("JSON unmarshal error from %s: %v (Message: %s)", peer.username, err, string(msg))
			continue // Пропускаем некорректное сообщение
		}

		// Логируем базовую информацию о сообщении
		msgType, ok := data["type"].(string)
		if !ok {
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
				if targetPeer != nil && !targetPeer.isLeader {
					// sdp := data["sdp"] // Удалено: Не используется
					log.Printf(">>> Forwarding OFFER from Leader %s to Follower %s", peer.username, targetPeer.username)
					// Log SDP content for debugging (optional, can be verbose)
					// if sdpMap, ok := data["sdp"].(map[string]interface{}); ok { // Проверяем прямо в data
					// 	if sdpStr, ok := sdpMap["sdp"].(string); ok {
					// 		log.Printf("Offer SDP:\n%s", sdpStr)
					// 	}
					// }

					targetPeer.mu.Lock() // Блокируем мьютекс целевого пира
					if targetPeer.conn != nil {
						if err := targetPeer.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
							log.Printf("!!! Error forwarding OFFER to %s: %v", targetPeer.username, err)
						}
					} else {
						log.Printf("Cannot forward OFFER, target follower %s connection is nil.", targetPeer.username)
					}
					targetPeer.mu.Unlock() // Разблокируем мьютекс целевого пира
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
					// sdp := data["sdp"] // Удалено: Не используется
					log.Printf("<<< Forwarding ANSWER from Follower %s to Leader %s", peer.username, targetPeer.username)
					// Log SDP content for debugging (optional, can be verbose)
					// if sdpMap, ok := data["sdp"].(map[string]interface{}); ok { // Проверяем прямо в data
					//  if sdpStr, ok := sdpMap["sdp"].(string); ok {
					// 	 log.Printf("Answer SDP:\n%s", sdpStr)
					//  }
					// }

					targetPeer.mu.Lock() // Блокируем мьютекс целевого пира
					if targetPeer.conn != nil {
						if err := targetPeer.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
							log.Printf("!!! Error forwarding ANSWER to %s: %v", targetPeer.username, err)
						}
					} else {
						log.Printf("Cannot forward ANSWER, target leader %s connection is nil.", targetPeer.username)
					}
					targetPeer.mu.Unlock() // Разблокируем мьютекс целевого пира
				} else {
					log.Printf("WARN: Received 'answer' from follower %s, but no valid leader target found (targetPeer: %v). Ignoring.", peer.username, targetPeer)
				}
			} else {
				log.Printf("WARN: Received 'answer' from non-follower %s. Ignoring.", peer.username)
			}

		case "ice_candidate":
			// ICE кандидаты пересылаются другому пиру в комнате
			if targetPeer != nil {
				if ice, iceOk := data["ice"].(map[string]interface{}); iceOk { // Проверяем тип перед доступом
					if candidate, candOk := ice["candidate"].(string); candOk {
						candSnippet := candidate
						if len(candSnippet) > 40 { // Обрезаем для лога
							candSnippet = candSnippet[:40]
						}
						log.Printf("... Forwarding ICE candidate from %s to %s (Candidate: %s...)", peer.username, targetPeer.username, candSnippet)
					} else {
						log.Printf("WARN: Received 'ice_candidate' from %s with invalid 'candidate' field.", peer.username)
						break // Не пересылаем некорректный кандидат
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