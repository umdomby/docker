package main

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:      func(r *http.Request) bool { return true },
	HandshakeTimeout: 10 * time.Second,
}

type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	Room  string      `json:"room"`
}

type Client struct {
	conn *websocket.Conn
	room string
}

var (
	clients   = make(map[*Client]bool)
	rooms     = make(map[string]map[*Client]bool)
	clientsMu sync.Mutex
)

func main() {
	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	log.Println("WebRTC Signaling Server started on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe error:", err)
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer ws.Close()

	client := &Client{conn: ws}
	registerClient(client)

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			unregisterClient(client)
			break
		}

		switch msg.Event {
		case "join":
			handleJoin(client, msg.Room)
		case "leave":
			handleLeave(client)
		case "offer", "answer", "candidate":
			broadcastToRoom(client, msg)
		}
	}
}

func registerClient(c *Client) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	clients[c] = true
	log.Println("New client connected")
}

func unregisterClient(c *Client) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	handleLeave(c)
	delete(clients, c)
	log.Println("Client disconnected")
}

func handleJoin(c *Client, room string) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	if c.room != "" {
		delete(rooms[c.room], c)
	}

	c.room = room
	if rooms[room] == nil {
		rooms[room] = make(map[*Client]bool)
	}
	rooms[room][c] = true

	log.Printf("Client joined room: %s (Total in room: %d)", room, len(rooms[room]))
}

func handleLeave(c *Client) {
	if c.room != "" {
		if rooms[c.room] != nil {
			delete(rooms[c.room], c)
			log.Printf("Client left room: %s (Remaining: %d)", c.room, len(rooms[c.room]))
		}
		c.room = ""
	}
}

func broadcastToRoom(sender *Client, msg Message) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	for client := range rooms[sender.room] {
		if client != sender {
			err := client.conn.WriteJSON(msg)
			if err != nil {
				log.Printf("Write error: %v", err)
				client.conn.Close()
				delete(rooms[sender.room], client)
			}
		}
	}
}
