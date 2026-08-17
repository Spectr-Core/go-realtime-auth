package socket

import (
	"sync"
)

type LogMessage struct {
	Type    string `json:"type"`    // "log"
	LogType string `json:"logType"` // error, buy, info, warning, success, user
	Message string `json:"message"`
	Time    int64  `json:"time"`
}

type LogsHistory struct {
	Type string       `json:"type"` // "logs_history"
	Logs []LogMessage `json:"logs"`
}

// Хранилище логов
type LogStorage struct {
	mu   sync.RWMutex
	logs []LogMessage
	max  int
}

func NewLogStorage(max int) *LogStorage {
	return &LogStorage{
		logs: make([]LogMessage, 0),
		max:  max,
	}
}

func (s *LogStorage) Add(log LogMessage) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.logs = append(s.logs, log)

	// Ограничиваем количество
	if len(s.logs) > s.max {
		s.logs = s.logs[len(s.logs)-s.max:]
	}
}

func (s *LogStorage) GetAll() []LogMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Возвращаем копию
	result := make([]LogMessage, len(s.logs))
	copy(result, s.logs)
	return result
}

// Глобальное хранилище
var logStorage = NewLogStorage(100)

// Отправка истории клиенту

// Тестовые логи для демонстрации
// func sendTestLogs() {
// 	testLogs := []struct {
// 		logType string
// 		message string
// 	}{
// 		{"user", "<strong>Admin</strong> connected to server"},
// 		{"info", "<strong>System:</strong> Server started successfully"},
// 		{"buy", "<strong>User #123</strong> purchased item for $99.99"},
// 		{"success", "<strong>Order #4892</strong> completed"},
// 		{"warning", "<strong>Warning:</strong> High memory usage"},
// 		{"error", "<strong>Error:</strong> Database connection timeout"},
// 	}

// 	for _, test := range testLogs {
// 		log := LogMessage{
// 			Type:    "log",
// 			LogType: test.logType,
// 			Message: test.message,
// 			Time:    time.Now().Unix(),
// 		}
// 		logStorage.Add(log)
// 		time.Sleep(100 * time.Millisecond)
// 	}
// }
