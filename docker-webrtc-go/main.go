package main

import (
	"encoding/json"
	"flag"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"sync"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // В продакшене замените на проверку origin
	},
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
	clients map[*Client]bool
}

var (
	rooms   = make(map[string]*Room)
	roomsMu sync.Mutex
)

func main() {
	port := flag.String("port", "8080", "port to serve on")
	flag.Parse()

	http.HandleFunc("/ws", handleWebSocket)

	log.Printf("WebRTC Signaling Server starting on port %s\n", *port)
	log.Fatal(http.ListenAndServe(":"+*port, nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	client := &Client{conn: conn}

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			removeClient(client)
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Println("Unmarshal error:", err)
			continue
		}

		switch message.Event {
		case "join":
			handleJoin(client, message.Data)
		case "offer", "answer", "candidate":
			handleRTCMessage(client, message.Event, message.Data)
		}
	}
}

func handleJoin(client *Client, data json.RawMessage) {
	var roomID string
	if err := json.Unmarshal(data, &roomID); err != nil {
		log.Println("Invalid room ID format:", err)
		return
	}

	roomsMu.Lock()
	defer roomsMu.Unlock()

	if roomID == "" {
		roomID = uuid.New().String()
	}

	room, exists := rooms[roomID]
	if !exists {
		room = &Room{
			clients: make(map[*Client]bool),
		}
		rooms[roomID] = room
	}

	client.roomID = roomID
	room.clients[client] = true

	log.Printf("Client joined room: %s (total clients: %d)", roomID, len(room.clients))

	response := map[string]interface{}{
		"event": "joined",
		"data":  roomID,
	}
	client.conn.WriteJSON(response)
}

func handleRTCMessage(sender *Client, event string, data json.RawMessage) {
	roomsMu.Lock()
	defer roomsMu.Unlock()

	room, exists := rooms[sender.roomID]
	if !exists {
		log.Println("Room not found:", sender.roomID)
		return
	}

	for client := range room.clients {
		if client != sender {
			message := map[string]interface{}{
				"event": event,
				"data":  json.RawMessage(data),
			}
			client.conn.WriteJSON(message)
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
		log.Println("Room deleted (no clients):", client.roomID)
	}
}
