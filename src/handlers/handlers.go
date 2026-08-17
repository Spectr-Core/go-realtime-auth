package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"project/auth"
	"project/database"
	"project/models"
	"project/socket"
	"text/template"
)

type Handler struct {
	db  *database.Database
	hub *socket.Hub
}

func New(db *database.Database, hub *socket.Hub) *Handler {
	return &Handler{
		db:  db,
		hub: hub,
	}
}

func (s *Handler) Main(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/loader" {
		http.ServeFile(w, r, "html/loader.html")
	} else {
		http.ServeFile(w, r, "html/regis.html")
	}
}
func (s *Handler) UserRegister(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Parse form error", http.StatusBadRequest)
		return
	}

	user := models.UserRegister{
		UserName:     r.FormValue("username"),
		UserPassword: r.FormValue("password"),
	}
	exists, ok, err := s.db.CheckUser(ctx, user.UserName)
	if err != nil {
		http.Error(w, "Server bad", http.StatusInternalServerError)
		return
	}

	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Error"))
		return
	}
	if exists {
		w.WriteHeader(http.StatusConflict)
		w.Write([]byte("ЮЗЕРНЕЙМ УЖЕ ЗНАЯТ ПОПРОБУЙТЕ ДРУГОЙ"))
		return
	}
	bycryptpassword, err := auth.PasswordBycrypt(user.UserPassword)
	if err != nil {
		log.Println("Error")
		return
	}
	useradd := s.db.RegisterUser(user.UserName, bycryptpassword)
	if useradd == true {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
	} else {
		w.WriteHeader(http.StatusConflict)
		w.Write([]byte("Error"))
		return
	}
}
func (s *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cookiesesion, soketerr := r.Cookie("socket_sesion")
	if soketerr == http.ErrNoCookie {
		auth.SetCookie(w, r, "socket_sesion")
	}
	switch r.Method {
	case http.MethodGet:
		tmpl, err := template.ParseFiles("html/login.html")
		if err != nil {
			http.Error(w, "template error", http.StatusInternalServerError)
			return
		}
		page := models.LoginPage{}

		if r.URL.Query().Get("error") != "" {
			page.Error = "Неверный логин или пароль"
		}

		err = tmpl.Execute(w, page)
		if err != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
			return
		}

	case http.MethodPost:
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "Parse form error", http.StatusBadRequest)
			return
		}
		var users models.UserLogin
		err = json.NewDecoder(r.Body).Decode(&users)
		if err != nil {
			http.Error(w, "Bad Json", http.StatusBadRequest)
			return
		}
		log.Println(users)
		user, ok, err := s.db.GetDataUser(ctx, users.UserName)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
		}
		if ok {
			if auth.VerifyPassword(user.UserPassword, users.UserPassword) {
				auth.SetCookieuser(w, r, user.ID)
				s.hub.SocketRedirect("/dashbord", cookiesesion.Value)
				s.hub.LogInfo("<strong>User:</strong> Susesful Login")
			} else {
				s.hub.SocketEror("invalid login", cookiesesion.Value)
				return
			}
		} else {
			s.hub.SocketEror("user not register", cookiesesion.Value)
			return
		}
		return
	default:
		http.Error(w, "Method not Alloved", 404)
		return
	}

}
func (s *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	ok := auth.UserLogout(w, r)
	if ok {
		http.Redirect(w, r, "/login", 302)
	} else {
		w.Write([]byte("Eror Handler Logout"))
	}
}

func (s *Handler) Dasbord(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		log.Println(r.URL.Path)
		switch r.URL.Path {
		case "/dashbord":
			tmpl, err := template.ParseFiles("html/panel.html")
			if err != nil {
				http.Error(w, "template error", http.StatusInternalServerError)
				return
			}
			id, ok := auth.GetUserIdCookie(w, r)
			if ok {
				user, err := s.db.GetUserById(ctx, id)
				if err != nil {
					http.Error(w, "user not found", http.StatusNotFound)
					return
				}
				page := models.DashboardPage{
					Username:     user.UserName,
					TotalRecords: 0,
					TodayRecords: 0,
				}
				err = tmpl.Execute(w, page)
				if err != nil {
					log.Println("DASHBOARD RENDER ERROR:", err)
					return
				}
			} else {
				http.Redirect(w, r, "/login", 302)
				return
			}
		}
	default:
	}
}
