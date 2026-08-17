package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		connString = "host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable"
	}
	conn, err := pgx.Connect(context.Background(), connString)
	if err != nil {
		fmt.Println("Connect Eror", err)
	}
	StartServer(conn)

}
