package auth

import (
	"log"
	"net/http"
	"sync"
	"time"
)

var session = make(map[string]int)
var mu sync.Mutex

func SetCookieuser(w http.ResponseWriter, r *http.Request, userid int) (cookie *http.Cookie) {
	cookie, err := r.Cookie("session_id")
	if err == http.ErrNoCookie {
		id, errr := GenerateUsersesion(10)
		if errr != nil {
			log.Println("EROR WITH GenerateRequestid LOGGER")
		}
		cookieset := http.Cookie{
			Name:    "session_id",
			Value:   id,
			Path:    "/",
			Expires: time.Now().Add(24 * time.Hour),
		}
		session[id] = userid
		http.SetCookie(w, &cookieset)
		return &cookieset
	} else {
		session[cookie.Value] = userid
	}
	return cookie
}

func GetUserIdCookie(w http.ResponseWriter, r *http.Request) (int, bool) {
	cookie, err := r.Cookie("session_id")
	if err == http.ErrNoCookie {
		return 0, false
	}
	userid, ok := session[cookie.Value]
	if ok {
		return userid, true
	} else {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return 0, false
	}
}
func SetCookie(w http.ResponseWriter, r *http.Request, name string) {
	mu.Lock()
	id, errr := GenerateUsersesion(10)
	if errr != nil {
		log.Println("EROR WITH GenerateRequestid LOGGER")
	}
	cookieset := http.Cookie{
		Name:    name,
		Value:   id,
		Path:    "/",
		Expires: time.Now().Add(24 * time.Hour),
	}
	http.SetCookie(w, &cookieset)
	mu.Unlock()
}

func DeleteCookie(w http.ResponseWriter) {
	cookidelet := http.Cookie{
		Name:   "session_id",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	}
	http.SetCookie(w, &cookidelet)

}
func UserLogout(w http.ResponseWriter, r *http.Request) bool {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		log.Println(err)
		return false
	}
	if _, exists := session[cookie.Value]; exists {
		delete(session, cookie.Value)
		DeleteCookie(w)
		return true
	} else {
		return false
	}
}
