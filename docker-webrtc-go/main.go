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
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	Room  string      `json:"room,omitempty"`
}

var rooms = make(map[string][]*websocket.Conn)
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
	rooms[room] = append(rooms[room], conn)
	log.Printf("Client joined room %s (total: %d)", room, len(rooms[room]))
}

func handleLeave(conn *websocket.Conn, room string) {
	roomsLock.Lock()
	defer roomsLock.Unlock()
	for i, c := range rooms[room] {
		if c == conn {
			rooms[room] = append(rooms[room][:i], rooms[room][i+1:]...)
			break
		}
	}
}

func broadcastToRoom(sender *websocket.Conn, room, event string, data interface{}) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	clients, ok := rooms[room]
	if !ok {
		return
	}

	for _, client := range clients {
		if client != sender {
			client.WriteJSON(SignalingMessage{
				Event: event,
				Data:  data,
			})
		}
	}
}
