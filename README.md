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
  migrations/002_customer_panel.sql   roles, products, price feed, buy/sell requests
  scripts/create-user.js     create a staff account
  scripts/import-from-supabase.js   one-off data migration
  src/
    app.js                   express app (middleware, routes)
    server.js                http + socket.io bootstrap, runs migrations
    config.js                env validation
    db/                      pg pool + migration runner
    middleware/              auth, validation, error handling
    modules/auth/            login / logout / me / change password
    modules/orders/          ledger (admin only): routes → service → repository
    modules/products/        price board, admin price editing
    modules/prices/          collector ingest (X-Qasr-Relay-Key)
    modules/requests/        customer buy/sell requests + admin accept/reject
    modules/customers/       admin: create / disable customers, reset passwords
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

There is no public sign-up. Admins are created with `npm run user:create`
(`<email> <password>`); customers are created by an admin on the **Customers** page
(or `node scripts/create-user.js --customer <username> <password> --name 'Full name'`).

## Customer panel

Customers sign in with the username and password an admin gave them and land on a
live price board (the 11 products of the collector). Tapping a product opens a sheet
with **buy** / **sell**, a quantity and the total; the request goes to the admin
inbox (**Customer requests**), who accepts or rejects it with an optional message.
Both sides see every request with its Jalali date and time, and the customer gets an
on-screen notification (toast, sound and bell badge) the moment it is answered.

* Prices are read on the server and locked into the request; if the price moved
  between the screen and the click the customer is asked to confirm the new one.
* **Buy** = customer buys from the shop (green price); **sell** = customer sells to the
  shop (red price). Accepting can also mirror the deal into the admin ledger (whole coins).
* Prices come from the collector, or are typed by hand on the **Prices** page. If a
  collector has connected and then goes silent (`FEED_STALE_SECONDS`), new requests are
  blocked until it is back.

### Price collector

`tools/zarabgold-collector.py` is your collector adapted to this server (no key inside
the file). Run it on a PC where you are logged in to the price source:

```bash
ZARABGOLD_ENDPOINT=http://<server>/api/prices/ingest \
ZARABGOLD_RECEIVER_KEY=<PRICE_RELAY_KEY from server/.env> python tools/zarabgold-collector.py
```

Afterwards open **Prices** and, for each product, pick its collector id from the list.
The key travels unencrypted until the site has a domain and SSL — add them soon.

#### Running it continuously on the server instead of a PC

`bash deploy/collector-setup.sh` (run once, after `deploy/setup.sh`) installs the
collector as a systemd service (`gold-collector`) under a virtual display
(`gold-display`), both restarting automatically on crash or reboot. It keeps its
hanzaeigold.ir login in a browser profile on disk, so you only log in once: open
the admin page **اتصال کالکتور** (`/collector`), which shows the collector's browser
as a live picture — click and type there to log in. (The collector serves this on
127.0.0.1:4100, protected by `PRICE_RELAY_KEY`; the API proxies it for admins only.
`gold-collector-login` + an SSH-tunnelled VNC viewer still works as an alternative.)

```
systemctl status gold-collector     # running?
journalctl -u gold-collector -f     # live log
```

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

All `/api/orders` routes require an **admin** session. `:side` is `buy` or `sell`.

| Method | Path                           | Notes                                                   |
| ------ | ------------------------------ | ------------------------------------------------------- |
| POST   | `/api/auth/login`              | `{ identifier, password }` (email or username) → cookie |
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


### Customer panel API

| Method | Path | Who | Notes |
| ------ | ---- | --- | ----- |
| GET | `/api/products` | any | price board (admins also get inactive items + unmapped collector ids) |
| GET/POST | `/api/requests` | customer | list own / create `{ productId, side, quantity, quotedPrice, note?, clientKey? }` |
| POST | `/api/requests/:id/cancel` | customer | only while pending |
| GET/POST | `/api/requests/unseen`, `/seen` | customer | notifications |
| GET | `/api/admin/requests` (+`/summary`) | admin | `?status=&side=&q=` |
| POST | `/api/admin/requests/:id/accept` / `reject` | admin | `{ note?, recordInLedger? }` |
| GET/POST/PATCH | `/api/admin/customers` | admin | create, disable, new password |
| PATCH | `/api/admin/products/:id` | admin | prices, visibility, collector id |
| POST | `/api/prices/ingest` | collector | header `X-Qasr-Relay-Key` |

Socket.IO events: `prices:changed` (everyone), `request:changed` (admins and the owner).
