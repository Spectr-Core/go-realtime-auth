package auth

import (
	"crypto/rand"
	"math/big"

	"golang.org/x/crypto/bcrypt"
)

func PasswordBycrypt(password string) (string, error) {
	// GenerateFromPassword automatically handles random salting
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
func VerifyPassword(hashedPassword string, plainPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}
func GenerateUsersesion(n int) (string, error) {
	// Алфавит из заглавных, строчных букв и цифр
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	bytes := make([]byte, n)
	for i := range bytes {
		// Генерируем случайный индекс в пределах длины алфавита
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		bytes[i] = charset[num.Int64()]
	}
	return string(bytes), nil
}
