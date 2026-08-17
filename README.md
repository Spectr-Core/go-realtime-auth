# auth-hub

This document covers the refactored, layered version of the project (`Login/project`), not the earlier flat-file version kept alongside it in the parent folder.

Realtime authentication service in Go with bcrypt-hashed credentials, cookie-based sessions, and a WebSocket hub that broadcasts live login activity and an online-user count to connected clients.

## Overview

`auth-hub` handles user registration and login through server-rendered HTML forms, storing credentials in PostgreSQL with bcrypt-hashed passwords and tracking sessions via a cookie mapped to a user ID.

On top of that base, it layers a WebSocket hub: every browser tab that connects to `/ws` is tracked by both connection and session cookie, and the hub broadcasts a live activity log (login events, errors, custom log entries) and an online-user count to all connected clients. A successful login is communicated back to the browser over this same WebSocket channel rather than through the HTTP response alone.

This is a refactor of an earlier single-package version of the same application (kept alongside this one in the parent `Login/` folder): the same auth/session/hub behavior, restructured into separate `auth`, `database`, `handlers`, `models`, and `socket` packages, with `context.Context` threaded from the incoming request into the database and WebSocket layers.

## Features

- User registration and login via server-rendered HTML forms (`html/template`)
- Passwords hashed with bcrypt (`golang.org/x/crypto/bcrypt`) — never stored in plaintext
- Cookie-based session management (`session_id` cookie mapped to a user ID)
- Auth middleware protecting `/logout`, `/dashbord`, `/profile`, `/settings`, `/data`, redirecting unauthenticated requests to `/login`
- WebSocket hub (`/ws`) that:
  - tracks multiple simultaneous connections per user session (reference-counted by cookie)
  - broadcasts a bounded (100-entry) rolling activity log, replayed to newly-connected clients
  - reports a live online-user count
  - supports ping/pong keepalive messages
  - pushes redirect and error events to a specific user's session in response to a login attempt
- Request-scoped `context.Context` threaded from the HTTP handler into database calls and the WebSocket connection's lifetime (cancelled on disconnect)
- Package-per-concern layout: `auth`, `database`, `handlers`, `models`, `socket`

## Architecture

```text
Browser
  |
  |--(HTML forms: /register, /login)--> Handler --> Database (PostgreSQL)
  |                                        |
  |                                        +--> auth (bcrypt, cookie session)
  |
  +--(WebSocket: /ws)--------------------> Hub
                                              |
                                              +-- clients map (per connection)
                                              +-- sessionsocket map (cookie -> connection)
                                              +-- LogStorage (bounded ring buffer, broadcast to all clients)
```

## Concurrency model

- **Per-connection goroutine**: each accepted WebSocket connection runs in its own handler goroutine (`hub.WebSocket`, `socket/hub.go`), blocking in a read loop for the life of the connection.
- **Per-connection context**: `context.WithCancel(r.Context())` is created per connection and cancelled via `defer cancel()` when the read loop exits — used to stop `SendLogsHistory` if the client disconnects before history finishes sending.
- **Hub synchronization**: a single `sync.Mutex` guards `clients`, `clientscookie`, `sessionsocket`, and `onlineUsers` (`socket/socket.go`). Broadcast methods (`SendNotification`, `SendLog`, `SendClient`) copy the client list under the lock, then write to sockets after releasing it, so the mutex isn't held during network I/O.
- **Activity log**: `LogStorage` uses a separate `sync.RWMutex` (`socket/comandsoket.go`) — reads (`GetAll`) take a read lock, writes (`Add`) take a write lock, and the buffer is trimmed to a fixed max (100 entries) on every append.
- **Session store**: a package-level `map[string]int` guarded by a `sync.Mutex` (`auth/cookie.go`) maps session cookie values to user IDs — in-memory, not persisted, not shared across instances.
- No `sync.WaitGroup` is used for coordinated shutdown; each connection cleans up independently via `defer`.

## Data / storage

- **PostgreSQL** via `github.com/jackc/pgx/v5`, no ORM. A single `*pgx.Conn` (not a connection pool) is created at startup and shared across all requests.
- Schema (inferred from the queries in `database/db.go`): a `user_app` table with at least `id`, `username`, `password_hash` columns. No migration files are included — the table must already exist.
- Query methods: `CheckUser` (existence check), `RegisterUser` (insert), `GetDataUser` / `GetUserById` (lookups by username / ID) — all parameterized (`$1`, `$2`, ...).
- The PostgreSQL connection string is read from the `DATABASE_URL` environment variable, falling back to a local-development default (`host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable`) if unset.

## Reliability / failure handling

- `context.Context` from the incoming HTTP request is threaded into database calls (`CheckUser`, `GetDataUser`, `GetUserById`) and into the WebSocket connection's lifecycle, so cancellation propagates instead of being silently ignored.
- The WebSocket read loop distinguishes an expected close (`websocket.IsCloseError` for going-away / normal-closure) from other read errors — though on an *unexpected* error it does not currently `continue`/`return` before attempting to process the message, which can mean processing stale data on that path (see *Current limitations*).
- Not present: retries, reconnect logic, circuit breaking. This is ordinary error returning, not fault tolerance.

## Security

- Passwords hashed with `bcrypt.GenerateFromPassword` / verified with `bcrypt.CompareHashAndPassword` (default cost) — plaintext passwords are never stored.
- Session and cookie values are generated with `crypto/rand`, not `math/rand`.
- `auth.AuthMiddleware` checks for a valid `session_id` cookie mapped to a known session before allowing access to protected routes.
- All SQL queries are parameterized.
- Not present: CSRF protection on the login/register forms, origin allowlisting on the WebSocket upgrade (`CheckOrigin` unconditionally returns `true`), HTTPS/TLS configuration, rate limiting on login attempts, or server-side expiry sweeping of session entries (cookie `Expires` is client-side only).

## Tech stack

- Go 1.26
- `net/http` + `html/template` (standard library, no framework)
- `github.com/jackc/pgx/v5` (PostgreSQL driver, no ORM)
- `github.com/gorilla/websocket`
- `golang.org/x/crypto/bcrypt`
- `crypto/rand`

## Project structure

```text
main.go       entrypoint: opens the PostgreSQL connection, starts the server
server.go     route registration, wires Database/Hub/Handler together
auth/         password hashing, session cookies, auth middleware
database/     PostgreSQL access layer (user lookup/registration)
handlers/     HTTP handlers (register, login, logout, dashboard)
models/       shared request/response/page data types
socket/       WebSocket hub: connection tracking, broadcast, bounded activity log
html/         server-rendered templates (login, register, dashboard, panel)
static/       static assets served under /static/
```

## Running locally

Requires a reachable PostgreSQL instance, with a `user_app` table already created (no migrations are included):

```bash
go mod download
export DATABASE_URL="host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable"
go run .
```

If `DATABASE_URL` is unset, `main.go` falls back to that same local-development default. The server listens on `:9090`.

## Configuration

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pgx DSN format) | No — falls back to a local-development default if unset |

The listen port (`:9090`) is a hardcoded constant in `server.go`.

## API

```text
GET  /                    serves the registration page
GET  /loader              serves a loader page (html/loader.html is referenced but not present in this repo)
POST /register            creates a new user (form-encoded: username, password)
GET  /login                serves the login page
POST /login                authenticates; on success sets a session cookie and pushes a redirect + log entry over the WebSocket connection for that session
GET  /logout      (auth)   clears the session
GET  /dashbord    (auth)   renders the dashboard
GET  /profile     (auth)   currently routed to the same handler as /dashbord
GET  /settings    (auth)   currently routed to the same handler as /dashbord
GET  /data        (auth)   currently routed to the same handler as /dashbord
GET  /ws                   WebSocket upgrade endpoint (activity feed, online count, ping/pong)
```

## Engineering decisions

- **WebSocket hub keyed by both connection and session cookie, with a reference count per cookie** — lets the same logged-in user have multiple tabs/connections open while the "online users" count reflects distinct users rather than distinct connections.
- **Login success is pushed over the already-open WebSocket connection** (`SocketRedirect`) rather than returned as a plain HTTP redirect — the login flow reuses the same real-time channel as the rest of the activity feed instead of a separate mechanism.
- **Bounded ring-buffer log storage (max 100 entries)** instead of an unbounded log — keeps memory use flat regardless of how long the process runs, at the cost of only retaining recent history.
- **`context.Context` threaded from the HTTP request into both the database layer and the WebSocket connection's lifetime** — a client disconnect or request cancellation is observable further down the call stack instead of being silently ignored.
- **Split into `auth` / `database` / `handlers` / `models` / `socket` packages**, refactored from a single-package predecessor — separates session/password logic, persistence, HTTP orchestration, and the realtime layer into independently readable units.

## Current limitations

- In-memory, single-process session store (`map[string]int` in `auth`) — sessions are lost on restart and cannot be shared across multiple instances; entries are never swept for server-side expiry.
- A data race: in `auth.SetCookieuser`, the existing-cookie branch writes to the shared `session` map without holding the package mutex, unlike every other write path to that map.
- No CSRF protection on the login/register forms; WebSocket `CheckOrigin` accepts all origins.
- The `/loader` route references `html/loader.html`, which is not present in this repository — that route currently fails.
- No automated tests, no database migrations (the schema must already exist), no graceful shutdown.
- The login POST handler both calls `ParseForm()` and JSON-decodes the request body — inconsistent with the registration handler, which only reads form values.

## Possible next steps

- Add CSRF protection and restrict WebSocket `CheckOrigin` to known origins.
- Replace the in-memory session map with a store that supports expiry and multiple instances (e.g. Redis-backed sessions).
- Add tests for `auth` (password hashing, session handling) and the WebSocket hub's client-tracking logic.
