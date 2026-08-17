package socket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"project/auth"
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients       map[*websocket.Conn]bool
	clientscookie map[string]int
	sessionsocket map[string]*websocket.Conn
	onlineUsers   int
	mu            sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		clients:       make(map[*websocket.Conn]bool),
		clientscookie: make(map[string]int),
		sessionsocket: make(map[string]*websocket.Conn),
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (hub *Hub) WebSocket(w http.ResponseWriter, r *http.Request) {
	var base WSMessage
	log.Println("WS request")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	cookiesesion, soketerr := r.Cookie("socket_sesion")
	if soketerr == http.ErrNoCookie {
		auth.SetCookie(w, r, "socket_sesion")
	}
	hub.AddClient(conn, cookiesesion.Value)

	hub.SendClient("usersupdate")
	hub.SendLogsHistory(ctx, conn)
	defer func() {
		hub.RemoveClient(conn, cookiesesion.Value)
		conn.Close()
		cancel()
	}()

	log.Println("WS connected")

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(
				err,
				websocket.CloseGoingAway,
				websocket.CloseNormalClosure,
			) {
				return
			}
		}
		if err := json.Unmarshal(data, &base); err != nil {
			log.Println("BAD JSON", err)
			continue
		}
		hub.SocketHendler(ctx, data, conn, base.Type)
	}
}
