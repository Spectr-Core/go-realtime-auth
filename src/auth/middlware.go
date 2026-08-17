package auth

import (
	"net/http"
)

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, soketerr := r.Cookie("socket_sesion")
		if soketerr == http.ErrNoCookie {
			SetCookie(w, r, "socket_sesion")
		}

		cookie, err := r.Cookie("session_id")
		if err == http.ErrNoCookie {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		_, ok := session[cookie.Value]
		if !ok {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		next(w, r)
	}
}
