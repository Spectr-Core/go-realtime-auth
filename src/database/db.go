package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"project/models"

	"github.com/jackc/pgx/v5"
)

type Database struct {
	conn *pgx.Conn
}

func New(conn *pgx.Conn) *Database {
	return &Database{
		conn: conn,
	}
}

func (db *Database) CheckUser(ctx context.Context, username string) (bool, bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 
			FROM user_app 
			WHERE username = $1
		);
	`

	var exists bool
	err := db.conn.QueryRow(ctx,
		query,
		username,
	).Scan(&exists)
	if err != nil {
		return false, false, fmt.Errorf("Eror chekuser %w", err)
	}
	return exists, true, nil
}
func (db *Database) GetUserById(ctx context.Context, id int) (models.User, error) {
	query := `
		SELECT id, username
		FROM user_app
		WHERE id = $1

	`

	var user models.User
	err := db.conn.QueryRow(ctx,
		query,
		id,
	).Scan(&user.ID, &user.UserName)
	if err != nil {
		log.Println(err)
		return models.User{}, fmt.Errorf("eror get user by id %w", err)
	}
	return user, nil
}

func (db *Database) RegisterUser(username string, password string) bool {
	query := `INSERT INTO user_app (username, password_hash) VALUES ($1, $2)`
	_, err := db.conn.Exec(context.Background(), query, username, password)
	if err != nil {
		log.Println("EROR", err)
		return false
	}
	return true
}
func (db *Database) GetDataUser(ctx context.Context, username string) (models.DataUser, bool, error) {
	var user models.DataUser
	err := db.conn.QueryRow(ctx, "SELECT id, username, password_hash FROM user_app WHERE username = $1", username).Scan(
		&user.ID,
		&user.UserName,
		&user.UserPassword,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			fmt.Println("Пользователь не найден", err)
			return user, false, fmt.Errorf("eror with getuser data %w", err)
		}
	}
	return user, true, nil
}
