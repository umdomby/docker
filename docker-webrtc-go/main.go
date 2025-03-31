package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // В продакшене замените на проверку origin
	},
	HandshakeTimeout: 10 * time.Second,
}

type Client struct {
	conn   *websocket.Conn
	roomID string
}

type Message struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

type Room struct {
	clients    map[*Client]bool
	createdAt  time.Time
	lastActive time.Time
}

var (
	rooms   = make(map[string]*Room)
	roomsMu sync.Mutex
	stats   = struct {
		totalConnections int
		activeRooms      int
	}{}
)

func main() {
	port := flag.String("port", "8080", "port to serve on")
	flag.Parse()

	// Добавленные endpoint'ы
	http.HandleFunc("/healthcheck", handleHealthCheck)
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/stats", handleStats)

	log.Printf("WebRTC Signaling Server starting on port %s\n", *port)
	go cleanupRooms()

	server := &http.Server{
		Addr:         ":" + *port,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

// Новый обработчик healthcheck
func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	client := &Client{conn: conn}
	stats.totalConnections++

	defer removeClient(client)

	// Улучшенная обработка сообщений
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Println("Unmarshal error:", err)
			sendError(client.conn, "invalid_message_format")
			continue
		}

		log.Printf("Received message: %s", message.Event)

		switch message.Event {
		case "join":
			handleJoin(client, message.Data)
		case "offer", "answer", "candidate":
			handleRTCMessage(client, message.Event, message.Data)
		case "ping":
			sendPong(client.conn)
		default:
			log.Println("Unknown event:", message.Event)
			sendError(client.conn, "unknown_event")
		}
	}
}

// Отправка ошибки клиенту
func sendError(conn *websocket.Conn, errorType string) {
	msg := map[string]interface{}{
		"event": "error",
		"data":  map[string]string{"type": errorType},
	}
	conn.WriteJSON(msg)
}

// Отправка pong на ping
func sendPong(conn *websocket.Conn) {
	conn.WriteJSON(map[string]string{"event": "pong"})
}

func handleJoin(client *Client, data json.RawMessage) {
	var roomID string
	if err := json.Unmarshal(data, &roomID); err != nil {
		log.Println("Invalid room ID format:", err)
		sendError(client.conn, "invalid_room_id")
		return
	}

	roomsMu.Lock()
	defer roomsMu.Unlock()

	if roomID == "" {
		roomID = uuid.New().String()
		log.Println("Creating new room:", roomID)
	}

	room, exists := rooms[roomID]
	if !exists {
		room = &Room{
			clients:    make(map[*Client]bool),
			createdAt:  time.Now(),
			lastActive: time.Now(),
		}
		rooms[roomID] = room
		stats.activeRooms++
	}

	client.roomID = roomID
	room.clients[client] = true
	room.lastActive = time.Now()

	log.Printf("Client joined room: %s (total clients: %d)", roomID, len(room.clients))

	response := map[string]interface{}{
		"event": "joined",
		"data":  roomID,
	}
	if err := client.conn.WriteJSON(response); err != nil {
		log.Println("Write error:", err)
	}
}

func handleRTCMessage(sender *Client, event string, data json.RawMessage) {
	roomsMu.Lock()
	defer roomsMu.Unlock()

	room, exists := rooms[sender.roomID]
	if !exists {
		log.Println("Room not found:", sender.roomID)
		sendError(sender.conn, "room_not_found")
		return
	}

	room.lastActive = time.Now()

	for client := range room.clients {
		if client != sender {
			message := map[string]interface{}{
				"event": event,
				"data":  json.RawMessage(data),
			}

			if err := client.conn.WriteJSON(message); err != nil {
				log.Println("Broadcast error:", err)
				client.conn.Close()
				delete(room.clients, client)
			}
		}
	}
}

func removeClient(client *Client) {
	roomsMu.Lock()
	defer roomsMu.Unlock()

	if client.roomID == "" {
		return
	}

	room, exists := rooms[client.roomID]
	if !exists {
		return
	}

	delete(room.clients, client)
	log.Printf("Client removed from room: %s (remaining clients: %d)", client.roomID, len(room.clients))

	if len(room.clients) == 0 {
		delete(rooms, client.roomID)
		stats.activeRooms--
		log.Println("Room deleted (no clients):", client.roomID)
	}
}

func cleanupRooms() {
	for {
		time.Sleep(5 * time.Minute)
		roomsMu.Lock()

		for id, room := range rooms {
			if time.Since(room.lastActive) > 30*time.Minute {
				for client := range room.clients {
					client.conn.Close()
				}
				delete(rooms, id)
				stats.activeRooms--
				log.Println("Room cleaned up due to inactivity:", id)
			}
		}

		roomsMu.Unlock()
	}
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	roomsMu.Lock()
	defer roomsMu.Unlock()

	stats := struct {
		TotalConnections int            `json:"total_connections"`
		ActiveRooms      int            `json:"active_rooms"`
		ClientsPerRoom   map[string]int `json:"clients_per_room"`
	}{
		TotalConnections: stats.totalConnections,
		ActiveRooms:      len(rooms),
		ClientsPerRoom:   make(map[string]int),
	}

	for id, room := range rooms {
		stats.ClientsPerRoom[id] = len(room.clients)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
