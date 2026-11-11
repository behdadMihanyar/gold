# Gold — buy/sell dashboard

Dashboard for recording gold-coin buy and sell orders, with live updates across
open screens.

| Layer     | Stack                                                                 |
| --------- | --------------------------------------------------------------------- |
| Frontend  | React 19, Vite, Tailwind, React Router                                 |
| API       | Node.js (≥ 20.12), Express 5, zod validation                           |
| Database  | PostgreSQL (≥ 13)                                                      |
| Auth      | Email + password (bcrypt), JWT in an httpOnly cookie                   |
| Realtime  | Socket.IO — `orders:changed` events after every write                 |

There is no Supabase dependency anymore.

## Project layout

```
server/                      API
  migrations/001_init.sql    schema (users, orders)
  scripts/create-user.js     create a staff account
  scripts/import-from-supabase.js   one-off data migration
  src/
    app.js                   express app (middleware, routes)
    server.js                http + socket.io bootstrap, runs migrations
    config.js                env validation
    db/                      pg pool + migration runner
    middleware/              auth, validation, error handling
    modules/auth/            login / signup / logout / me
    modules/orders/          routes → service → repository
    realtime/                event bus + socket.io bridge
src/
  api/                       fetch client, auth + orders API, realtime hook
  utils/orderHandlers.js     form helpers + per-side (buy/sell) actions
  utils/format.js            Persian digits, price formatting, Jalali today
```

## Running locally

### Option A — Docker for the API and database

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
docker compose up -d --build
docker compose exec api npm run user:create -- you@example.com 'your-password'

npm install          # frontend
npm run dev          # http://localhost:5173 (proxies /api and /socket.io to :4000)
```

### Option B — your own PostgreSQL

```bash
cd server
cp .env.example .env         # set DATABASE_URL and JWT_SECRET
npm install
npm run migrate
npm run user:create -- you@example.com 'your-password'
npm run dev                  # API on http://localhost:4000

cd ..
npm install
npm run dev
```

Public sign-up is **off** by default (`ALLOW_SIGNUP=false`); staff accounts are
created with `npm run user:create`.

## Moving your data off Supabase

The import script reads straight from the old Supabase Postgres database and
copies `public.buy` → buy orders, `public.tasks` → sell orders, and `auth.users`
→ users. Supabase stores bcrypt hashes, so **existing passwords keep working**.

```bash
cd server
SUPABASE_DB_URL='postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres' \
  node scripts/import-from-supabase.js
```

(Connection string: Supabase dashboard → Project Settings → Database.) The script
runs in one transaction, refuses to run if `orders` already has rows, converts
the old text fields (`"12/500/000"`, Persian-digit dates) into proper numbers and
dates, and prints any rows it had to skip.

## API

All `/api/orders` routes require a session. `:side` is `buy` or `sell`.

| Method | Path                           | Notes                                                   |
| ------ | ------------------------------ | ------------------------------------------------------- |
| POST   | `/api/auth/login`              | `{ email, password }` → sets session cookie             |
| POST   | `/api/auth/signup`             | only when `ALLOW_SIGNUP=true`                           |
| POST   | `/api/auth/logout`             |                                                         |
| GET    | `/api/auth/me`                 | current user                                            |
| GET    | `/api/orders/:side`            | `?page=&pageSize=(≤500)&date=YYYY/MM/DD&q=name`         |
| GET    | `/api/orders/:side/summary`    | `?date=` → `{ count, quantity, amount }`                |
| GET    | `/api/orders/:side/:id`        |                                                         |
| POST   | `/api/orders/:side`            | `{ name, quantity, price, date, delivery?, description?, status?, accounting? }` |
| PATCH  | `/api/orders/:side/:id`        | any subset of the fields above                          |
| DELETE | `/api/orders/:side/:id`        |                                                         |
| GET    | `/api/health`                  | DB connectivity check                                   |

Numbers may be sent as `12500000`, `"12/500/000"` or with Persian digits; dates
as `"1405/08/20"` or `"۱۴۰۵/۰۸/۲۰"`. The server stores integers and computes
`total = quantity × price` itself. Status is one of `تسویه نشده`, `پرداخت شده`,
`تحویل شده`.

Errors look like `{ "error": { "message": "...", "details": [...] } }`.

## Deploying

Serve the built frontend (`npm run build` → `dist/`) and the API from the
**same origin**, e.g. with nginx routing `/api` and `/socket.io` (WebSocket
upgrade enabled) to the API container. In production the session cookie is
`Secure`, so use HTTPS. If the frontend must live on another origin, set
`VITE_API_URL` at build time and `CORS_ORIGINS` on the API.

## Tests

```bash
cd server && npm test
```

## Deploy to a Linux server (Ubuntu / Debian)

As root on the server:

```bash
apt-get update && apt-get install -y git
git clone -b remove-supabase https://github.com/behdadMihanyar/gold /opt/gold
bash /opt/gold/deploy/setup.sh
```

The script installs Node.js, PostgreSQL and nginx. It creates the database and writes `server/.env` with random secrets, builds the frontend and runs the API as the `gold-api` systemd service. nginx serves the site on port 80, and the script asks for the first admin account. To update later, run `bash /opt/gold/deploy/setup.sh` again.

While the site is served over plain `http://`, `COOKIE_SECURE=false` is set in `server/.env`. After you add a domain and SSL, change it to `true` and run `systemctl restart gold-api`.
