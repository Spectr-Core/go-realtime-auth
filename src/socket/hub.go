package socket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

type WSMessage struct {
	Type string `json:"type"`
}
type Ping struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}
type Notification struct {
	Icon     string   `json:"icon"`
	Title    string   `json:"title"`
	Subtitle string   `json:"subtitle"`
	Actions  []string `json:"actions"` // Изменено с map на slice
	ID       string   `json:"id"`      // Уникальный ID для управления
}

func (h *Hub) SocketHendler(ctx context.Context, data []byte, conn *websocket.Conn, t string) {
	switch t {
	case "ping":
		var ping Ping
		json.Unmarshal(data, &ping)
		conn.WriteJSON(map[string]string{
			"type":    "pong",
			"message": ping.Message,
		})
	case "users":
		userscount := h.OnlineUsers()
		conn.WriteJSON(map[string]any{
			"type":  "userscount",
			"count": userscount,
		})
	default:
		h.handleMessage(ctx, conn, data)
	}

}

func (h *Hub) SocketEror(t string, cookie string) {
	client := h.sessionsocket[cookie]
	log.Println(t)
	err := client.WriteJSON(map[string]string{
		"type": t,
	})
	if err != nil {
		log.Println("SocketEror", err)
		errStr := fmt.Sprintf("SocketEror: %v", err)
		h.LogError(errStr)
	}
}
func (h *Hub) SocketRedirect(rout string, cookie string) {
	client := h.sessionsocket[cookie]
	err := client.WriteJSON(map[string]string{
		"type": "redirect",
		"rout": rout,
	})
	if err != nil {
		errStr := fmt.Sprintf("SocketEror: %v", err)
		h.LogError(errStr)
		log.Println("SocketEror", err)
		h.RemoveBadClient(client)
	}
}

func (h *Hub) AddClient(conn *websocket.Conn, cookie string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[conn] = true
	h.sessionsocket[cookie] = conn

	if h.clientscookie[cookie] == 0 {
		h.onlineUsers++
	}
	h.clientscookie[cookie]++
}
func (h *Hub) RemoveClient(conn *websocket.Conn, cookie string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, conn)

	h.clientscookie[cookie]--
	if h.clientscookie[cookie] <= 0 {
		delete(h.clientscookie, cookie)
		delete(h.sessionsocket, cookie)
		h.onlineUsers--
	}
}
func (h *Hub) RemoveBadClient(client *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.clients, client)
	client.Close()
}
func (h *Hub) OnlineUsers() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.onlineUsers

}
func (h *Hub) SendClient(t string) {
	switch t {
	case "usersupdate":
		h.mu.Lock()
		clients := make([]*websocket.Conn, 0, len(h.clients))
		for client := range h.clients {
			clients = append(clients, client)
		}
		userscount := h.onlineUsers
		h.mu.Unlock()
		for _, client := range clients {
			err := client.WriteJSON(map[string]any{
				"type":  "userscount",
				"count": userscount,
			})
			if err != nil {
				h.RemoveBadClient(client)
			}
		}
	}
}
func (h *Hub) SendLogsHistory(ctx context.Context, client *websocket.Conn) {
	select {
	case <-ctx.Done():
		return
	default:
	}
	logs := logStorage.GetAll()
	if len(logs) == 0 {
		logs = logStorage.GetAll()
	}
	history := LogsHistory{
		Type: "logs_history",
		Logs: logs,
	}
	jsonData, err := json.Marshal(history)
	if err != nil {
		errStr := fmt.Sprintf("Ошибка чтенния: %v", err)
		h.LogError(errStr)
	}
	client.WriteMessage(websocket.TextMessage, jsonData)
}

// Отправка уведомленний
func (h *Hub) SendNotification(n Notification) {
	h.mu.Lock()
	if n.ID == "" {
		n.ID = fmt.Sprintf("note-%d", time.Now().UnixNano())
	}
	clients := make([]*websocket.Conn, 0, len(h.clients))
	for client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.Unlock()
	for _, client := range clients {
		err := client.WriteJSON(map[string]interface{}{
			"type":     "notification",
			"id":       n.ID,
			"icon":     n.Icon,
			"title":    n.Title,
			"subtitle": n.Subtitle,
			"actions":  n.Actions,
		})
		if err != nil {
			h.RemoveBadClient(client)
		}
	}
}

// Отправка лога (сохраняет и рассылает)
func (h *Hub) SendLog(logType, message string) {

	log := LogMessage{
		Type:    "log",
		LogType: logType,
		Message: message,
		Time:    time.Now().Unix(),
	}
	h.mu.Lock()
	logStorage.Add(log)
	jsonData, err := json.Marshal(log)
	if err != nil {
		errStr := fmt.Sprintf("SendLog чтенния: %v", err)
		h.LogError(errStr)
	}
	clients := make([]*websocket.Conn, 0, len(h.clients))
	for client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.Unlock()

	for _, client := range clients {
		err := client.WriteMessage(websocket.TextMessage, jsonData)
		if err != nil {
			h.RemoveBadClient(client)
		}
	}
}

// Обработка входящих сообщений
func (h *Hub) handleMessage(ctx context.Context, client *websocket.Conn, msg []byte) {
	var data map[string]interface{}
	if err := json.Unmarshal(msg, &data); err != nil {
		return
	}

	msgType, ok := data["type"].(string)
	if !ok {
		log.Println("EROR SOCKET COMMAND")
		return
	}

	switch msgType {
	case "get_logs":
		// Клиент запрашивает историю
		h.SendLogsHistory(ctx, client)

	case "log":
		// Получен лог от клиента (сохраняем и рассылаем)
		logType, _ := data["logType"].(string)
		message, _ := data["message"].(string)

		if logType != "" && message != "" {
			h.SendLog(logType, message)
		}
	}
}

// Удобные функции для разных типов логов
func (h *Hub) LogError(message string) {
	h.SendLog("error", message)
}

func (h *Hub) LogBuy(message string) {
	h.SendLog("buy", message)
}

func (h *Hub) LogInfo(message string) {
	h.SendLog("info", message)
}

func (h *Hub) LogWarning(message string) {
	h.SendLog("warning", message)
}

func (h *Hub) LogSuccess(message string) {
	h.SendLog("success", message)
}

func (h *Hub) LogUser(message string) {
	h.SendLog("user", message)
}
