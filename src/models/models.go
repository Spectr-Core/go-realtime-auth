package models

type User struct {
	ID       int    `json:"id"`
	UserName string `json:"username"`
}
type UserRegister struct {
	UserName     string `json:"username"`
	UserPassword string `json:"password"`
}
type UserLogin struct {
	UserName     string `json:"username"`
	UserPassword string `json:"password"`
}
type DataUser struct {
	ID           int    `json:"id"`
	UserName     string `json:"username"`
	UserPassword string `json:"password"`
}
type LoginPage struct {
	Error string
}
type DashboardPage struct {
	Username     string
	TotalRecords int
	TodayRecords int
}
