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

type websocketMessage struct {
	Event string `json:"event"`
	Data  string `json:"data"`
	Room  string `json:"room,omitempty"`
}

var rooms = make(map[string][]*websocket.Conn)
var roomsLock sync.Mutex

func main() {
	http.HandleFunc("/ws", websocketHandler)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	fmt.Println("Server running on :8080")
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

		var message websocketMessage
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Println("Unmarshal error:", err)
			continue
		}

		switch message.Event {
		case "join":
			joinRoom(conn, message.Room)
		case "offer":
			broadcastInRoom(conn, message.Room, msg)
		case "answer":
			broadcastInRoom(conn, message.Room, msg)
		case "candidate":
			broadcastInRoom(conn, message.Room, msg)
		}
	}
}

func joinRoom(conn *websocket.Conn, room string) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	rooms[room] = append(rooms[room], conn)
	log.Printf("Client joined room %s, now %d clients", room, len(rooms[room]))
}

func broadcastInRoom(sender *websocket.Conn, room string, msg []byte) {
	roomsLock.Lock()
	defer roomsLock.Unlock()

	clients, ok := rooms[room]
	if !ok {
		return
	}

	for _, client := range clients {
		if client != sender {
			if err := client.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Println("Write error:", err)
			}
		}
	}
}
