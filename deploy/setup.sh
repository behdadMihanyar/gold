#!/usr/bin/env bash
# Gold dashboard — one-shot server setup for Ubuntu / Debian.
#
# First install (as root):
#   apt-get update && apt-get install -y git
#   git clone -b remove-supabase https://github.com/behdadMihanyar/gold /opt/gold
#   bash /opt/gold/deploy/setup.sh
#
# Update later (pulls the latest code, rebuilds, restarts):
#   bash /opt/gold/deploy/setup.sh
#
# Result: the dashboard is served by nginx on port 80 (http://<server-ip>/),
# the API runs as a systemd service (gold-api) on 127.0.0.1:4000,
# data lives in a local PostgreSQL database "gold".
set -euo pipefail

APP_DIR=/opt/gold
BRANCH=remove-supabase
REPO=https://github.com/behdadMihanyar/gold
# Mirrors used when github.com itself is unreachable (common from Iran).
REPO_MIRRORS=(
  https://kkgithub.com/behdadMihanyar/gold
  https://hub.gitmirror.com/https://github.com/behdadMihanyar/gold
)
APP_USER=gold
NODE_MAJOR=22

log()  { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root."
command -v apt-get >/dev/null || die "This script supports Ubuntu/Debian only."
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- packages
log "Installing system packages (nginx, PostgreSQL, git, curl)"
apt-get update -y
apt-get install -y ca-certificates curl git nginx postgresql openssl xz-utils

node_ok() {
  command -v node >/dev/null &&
    node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=12)?0:1)'
}

install_node_tarball() {
  local base=$1 ver arch
  case "$(uname -m)" in
    x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) die "Unsupported CPU $(uname -m)" ;;
  esac
  ver=$(curl -fsSL --max-time 30 "$base/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" |
        grep -o "node-v[0-9.]*-linux-${arch}.tar.xz" | head -1) || return 1
  [ -n "$ver" ] || return 1
  curl -fsSL --max-time 300 "$base/latest-v${NODE_MAJOR}.x/$ver" -o /tmp/node.tar.xz || return 1
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
  rm -f /tmp/node.tar.xz
}

if ! node_ok; then
  log "Installing Node.js $NODE_MAJOR"
  if curl -fsSL --max-time 30 "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" -o /tmp/nodesource.sh &&
     bash /tmp/nodesource.sh && apt-get install -y nodejs && node_ok; then
    :
  else
    log "NodeSource unreachable — trying official / mirror tarballs"
    install_node_tarball https://nodejs.org/dist ||
    install_node_tarball https://npmmirror.com/mirrors/node ||
      die "Could not download Node.js. Check the server's internet access."
  fi
fi
node_ok || die "Node.js >= 20.12 is required, found $(node -v 2>/dev/null || echo none)"
echo "Node $(node -v), npm $(npm -v)"

# Use a reachable npm registry (falls back to a mirror if npmjs.org is blocked).
if ! curl -fsS --max-time 15 https://registry.npmjs.org/ >/dev/null; then
  log "registry.npmjs.org unreachable — using npmmirror.com"
  npm config set registry https://registry.npmmirror.com --location=global
fi

# ---------------------------------------------------------------- code
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"

# Try github.com first; if it's blocked, fall through to a mirror.
pick_repo() {
  for u in "$REPO" "${REPO_MIRRORS[@]}"; do
    if GIT_TERMINAL_PROMPT=0 timeout 25 git ls-remote "$u" "$BRANCH" >/dev/null 2>&1; then
      echo "$u"; return 0
    fi
    log "Can't reach $u — trying next"
  done
  die "Can't reach github.com or any mirror. Check your internet connection and try again."
}
ACTIVE_REPO=$(pick_repo)
log "Using $ACTIVE_REPO"

if [ -d "$APP_DIR/.git" ]; then
  log "Updating code in $APP_DIR"
  git config --global --add safe.directory "$APP_DIR"
  git -C "$APP_DIR" remote set-url origin "$ACTIVE_REPO"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout -q "$BRANCH"
  git -C "$APP_DIR" reset -q --hard "origin/$BRANCH"
else
  log "Cloning $ACTIVE_REPO ($BRANCH) into $APP_DIR"
  git clone -b "$BRANCH" "$ACTIVE_REPO" "$APP_DIR"
fi

# ---------------------------------------------------------------- database
ENV_FILE="$APP_DIR/server/.env"
systemctl enable --now postgresql

if [ ! -f "$ENV_FILE" ]; then
  log "Creating PostgreSQL role and database 'gold'"
  DB_PASS=$(openssl rand -hex 24)
  if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='gold'" | grep -q 1; then
    runuser -u postgres -- psql -qc "ALTER ROLE gold WITH LOGIN PASSWORD '$DB_PASS'"
  else
    runuser -u postgres -- psql -qc "CREATE ROLE gold WITH LOGIN PASSWORD '$DB_PASS'"
  fi
  runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='gold'" | grep -q 1 ||
    runuser -u postgres -- createdb -O gold gold

  log "Writing $ENV_FILE"
  cat >"$ENV_FILE" <<EOF
NODE_ENV=production
PORT=4000
DATABASE_URL=postgres://gold:${DB_PASS}@127.0.0.1:5432/gold
JWT_SECRET=$(openssl rand -hex 48)
JWT_EXPIRES_IN=7d
# Site is served over plain http:// for now. Set to true after adding SSL.
COOKIE_SECURE=false
ALLOW_SIGNUP=false
EOF
fi
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------- build
log "Installing dependencies and building the frontend"
cd "$APP_DIR"
npm install --no-audit --no-fund
npm run build
npm --prefix server install --omit=dev --no-audit --no-fund

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Running database migrations"
runuser -u "$APP_USER" -- bash -c "cd '$APP_DIR/server' && node src/db/migrate.js"

# ---------------------------------------------------------------- API service
log "Installing systemd service gold-api"
cat >/etc/systemd/system/gold-api.service <<EOF
[Unit]
Description=Gold dashboard API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/server
ExecStart=$(command -v node) src/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable gold-api >/dev/null
systemctl restart gold-api

# ---------------------------------------------------------------- nginx
log "Configuring nginx"
cat >/etc/nginx/sites-available/gold <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root $APP_DIR/dist;
    index index.html;
    client_max_body_size 2m;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 1h;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
ln -sf /etc/nginx/sites-available/gold /etc/nginx/sites-enabled/gold
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null
systemctl reload nginx || systemctl restart nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null
  ufw allow OpenSSH >/dev/null
fi

# ---------------------------------------------------------------- health check
log "Checking the API"
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
[ "${ok:-}" = 1 ] || { journalctl -u gold-api -n 40 --no-pager; die "API did not start (logs above)."; }

# ---------------------------------------------------------------- first user
USERS=$(runuser -u postgres -- psql -d gold -tAc "SELECT count(*) FROM users" 2>/dev/null || echo 0)
if [ "${USERS:-0}" = "0" ] && [ -t 0 ]; then
  log "Create the first admin account"
  read -rp "Admin email: " ADMIN_EMAIL
  while :; do
    read -rsp "Admin password (min 8 chars): " ADMIN_PASS; echo
    [ "${#ADMIN_PASS}" -ge 8 ] && break
    echo "Too short, try again."
  done
  runuser -u "$APP_USER" -- bash -c "cd '$APP_DIR/server' && node scripts/create-user.js \"\$0\" \"\$1\"" "$ADMIN_EMAIL" "$ADMIN_PASS"
fi

IP=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
log "Done!  Open  http://$IP/"
echo "Add more users:  cd $APP_DIR/server && runuser -u $APP_USER -- node scripts/create-user.js <email> <password>"
echo "API logs:        journalctl -u gold-api -f"
