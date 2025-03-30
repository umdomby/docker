package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type SignalingMessage struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
	Room  string          `json:"room,omitempty"`
}

type Room struct {
	clients map[*websocket.Conn]bool
}

var rooms = make(map[string]*Room)
var roomsLock sync.Mutex

func main() {
	http.HandleFunc("/ws", websocketHandler)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	fmt.Println("WebRTC Signaling Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func websocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("Upgrade error:", err)
		return
	}
	defer conn.Close()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			handleDisconnect(conn)
			return
		}

		var message SignalingMessage
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Println("Unmarshal error:", err)
			continue
		}

		switch message.Event {
		case "join":
			handleJoin(conn, message.Room)
		case "leave":
			handleLeave(conn, message.Room)
		case "offer", "answer", "ice-candidate":
			broadcastToRoom(conn, message.Room, message.Event, message.Data)
		default:
			log.Println("Unknown event:", message.Event)
		}
	}
}

func handleJoin(conn *websocket.Conn, room string) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	if _, exists := rooms[room]; !exists {
		rooms[room] = &Room{clients: make(map[*websocket.Conn]bool)}
	}

	rooms[room].clients[conn] = true
	log.Printf("Client joined room %s (total: %d)", room, len(rooms[room].clients))
}

func handleLeave(conn *websocket.Conn, room string) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	if r, exists := rooms[room]; exists {
		delete(r.clients, conn)
		if len(r.clients) == 0 {
			delete(rooms, room)
		}
	}
}

func handleDisconnect(conn *websocket.Conn) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	for roomName, room := range rooms {
		if room.clients[conn] {
			delete(room.clients, conn)
			log.Printf("Client disconnected from room %s (remaining: %d)", roomName, len(room.clients))
			if len(room.clients) == 0 {
				delete(rooms, roomName)
			}
			break
		}
	}
}

func broadcastToRoom(sender *websocket.Conn, room, event string, data json.RawMessage) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	roomObj, exists := rooms[room]
	if !exists {
		return
	}

	for client := range roomObj.clients {
		if client != sender {
			if err := client.WriteJSON(SignalingMessage{
				Event: event,
				Data:  data,
			}); err != nil {
				log.Println("Write error:", err)
				client.Close()
				delete(roomObj.clients, client)
			}
		}
	}
}
