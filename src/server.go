package main

import (
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"

	"project/auth"
	"project/database"
	"project/handlers"
	"project/socket"
)

type Database struct {
	conn *pgx.Conn
}
type Server struct {
	db       *database.Database
	hub      *socket.Hub
	handlers *handlers.Handler
}

func StartServer(conn *pgx.Conn) {
	log.Println("http://localhost:9090")
	db := database.New(conn)
	hub := socket.NewHub()
	h := handlers.New(db, hub)

	Server := Server{
		db:       db,
		hub:      hub,
		handlers: h,
	}

	_ = Server
	http.Handle(
		"/static/",
		http.StripPrefix(
			"/static/",
			http.FileServer(http.Dir("./static")),
		),
	)
	// Фичы
	http.HandleFunc("/", h.Main)
	http.HandleFunc("/loader", h.Main)

	// Маршруты
	http.HandleFunc("/register", h.UserRegister)
	http.HandleFunc("/login", h.Login)
	http.HandleFunc("/logout", auth.AuthMiddleware(h.Logout))
	http.HandleFunc("/dashbord", auth.AuthMiddleware(h.Dasbord))
	http.HandleFunc("/profile", auth.AuthMiddleware(h.Dasbord))
	http.HandleFunc("/data", auth.AuthMiddleware(h.Dasbord))
	http.HandleFunc("/settings", auth.AuthMiddleware(h.Dasbord))
	//COKET
	http.HandleFunc("/ws", hub.WebSocket)
	http.ListenAndServe(":9090", nil)
}
