#!/usr/bin/env bash
# Gold dashboard — price collector, running continuously on this server.
#
# Run once (as root), after deploy/setup.sh has already set up the dashboard:
#   bash /opt/gold/deploy/collector-setup.sh
#
# Result: a virtual display (Xvfb) and the collector (tools/zarabgold-collector.py)
# both run as systemd services and restart automatically — on crash, and on reboot.
# The collector keeps its hanzaeigold.ir login in a Chromium profile under
# /opt/gold/tools/.data/chrome-profile, so you only log in once (see the end of
# this script's output for how).
set -euo pipefail

APP_DIR=/opt/gold
APP_USER=gold
# Pick a display number nothing else on this (possibly shared) server is already using.
DISPLAY_NUM=99
while [ -e "/tmp/.X11-unix/X$DISPLAY_NUM" ] || [ -e "/tmp/.X$DISPLAY_NUM-lock" ]; do
  DISPLAY_NUM=$((DISPLAY_NUM + 1))
done
VNC_PORT=5999 # only listens on 127.0.0.1 — reach it through an SSH tunnel, never expose it

log()  { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root."
[ -d "$APP_DIR/tools" ] || die "$APP_DIR not found — run deploy/setup.sh first."
id "$APP_USER" >/dev/null 2>&1 || die "User '$APP_USER' not found — run deploy/setup.sh first."

ENV_FILE="$APP_DIR/server/.env"
[ -f "$ENV_FILE" ] || die "$ENV_FILE not found — run deploy/setup.sh first."
RELAY_KEY=$(grep '^PRICE_RELAY_KEY=' "$ENV_FILE" | cut -d= -f2- || true)
[ -n "$RELAY_KEY" ] || die "PRICE_RELAY_KEY not set in $ENV_FILE — run deploy/setup.sh first (it generates one)."
IP=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

# ---------------------------------------------------------------- packages
log "Using display :$DISPLAY_NUM for the virtual display"
log "Installing system packages (Xvfb, x11vnc, Python, Chromium's dependencies)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y xvfb x11vnc python3-venv

log "Installing Chromium (system package — Playwright's own download CDN is blocked from some locations)"
apt-get install -y chromium
CHROMIUM_BIN=$(command -v chromium || command -v chromium-browser || true)
[ -n "$CHROMIUM_BIN" ] || die "chromium installed but its binary was not found on PATH."

log "Installing Playwright (automation library only — using the Chromium above, not its own)"
runuser -u "$APP_USER" -- bash -c "
  cd '$APP_DIR/tools'
  python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip playwright
"

mkdir -p "$APP_DIR/tools/.data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/tools/.data"

# ---------------------------------------------------------------- virtual display
log "Installing systemd service gold-display (Xvfb :$DISPLAY_NUM)"
cat >/etc/systemd/system/gold-display.service <<EOF
[Unit]
Description=Virtual display for the Gold price collector

[Service]
Type=simple
User=$APP_USER
# A lock file surviving an unclean exit (crash, OOM-kill) would otherwise make every
# restart fail with "Server is already active for display $DISPLAY_NUM" forever.
ExecStartPre=/bin/rm -f /tmp/.X$DISPLAY_NUM-lock
ExecStart=/usr/bin/Xvfb :$DISPLAY_NUM -screen 0 1280x800x24 -nolisten tcp
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# ---------------------------------------------------------------- collector
log "Installing systemd service gold-collector"
cat >/etc/systemd/system/gold-collector.service <<EOF
[Unit]
Description=Gold price collector (hanzaeigold.ir -> dashboard)
After=network.target gold-display.service
Requires=gold-display.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/tools
Environment=DISPLAY=:$DISPLAY_NUM
Environment=ZARABGOLD_ENDPOINT=http://127.0.0.1/api/prices/ingest
Environment=ZARABGOLD_RECEIVER_KEY=$RELAY_KEY
Environment=ZARABGOLD_DATA_DIR=$APP_DIR/tools/.data
Environment=ZARABGOLD_CHROMIUM_EXECUTABLE=$CHROMIUM_BIN
ExecStart=$APP_DIR/tools/.venv/bin/python zarabgold-collector.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ---------------------------------------------------------------- on-demand VNC
# x11vnc is installed but NOT started automatically — it only runs while you are
# actively logging in, and only on 127.0.0.1 (never reachable from the internet).
log "Installing a one-shot helper: gold-collector-login"
cat >/usr/local/bin/gold-collector-login <<EOF
#!/usr/bin/env bash
# Opens a VNC session on 127.0.0.1:$VNC_PORT so you can log in to hanzaeigold.ir
# inside the collector's browser. Reach it through an SSH tunnel (see below), then
# press Ctrl+C here once you are logged in.
set -e
echo "Reach this from your own computer with:"
echo "  ssh -L $VNC_PORT:localhost:$VNC_PORT root@$IP"
echo "Then point a VNC viewer at localhost:$VNC_PORT (no password)."
echo "Log in to hanzaeigold.ir normally in that window, then press Ctrl+C here."
exec x11vnc -display :$DISPLAY_NUM -localhost -rfbport $VNC_PORT -nopw -forever
EOF
chmod +x /usr/local/bin/gold-collector-login

systemctl daemon-reload
systemctl enable --now gold-display
systemctl enable --now gold-collector

log "Done! The collector is running (and will restart on crash or reboot)."
cat <<MSG

One-time step — log in to hanzaeigold.ir so the collector can read prices:

  1. On YOUR OWN computer, open a terminal and run:
       ssh -L $VNC_PORT:localhost:$VNC_PORT root@$IP
     (leave this running)

  2. On the server, in a second SSH session, run:
       gold-collector-login
     (leave this running too)

  3. On your own computer, open a VNC viewer (e.g. RealVNC Viewer, TigerVNC) and
     connect to  localhost:$VNC_PORT  (no password needed — it only works because
     of the SSH tunnel in step 1). You'll see the collector's browser window;
     log in to hanzaeigold.ir there, the normal way.

  4. Once logged in, press Ctrl+C in both terminals. The login is saved in the
     browser profile — you will not need to repeat this unless you're logged out
     by hanzaeigold.ir itself.

Check it's working:
  systemctl status gold-collector
  journalctl -u gold-collector -f
Once prices start arriving, map each product to its collector ID on the admin
Prices page (the IDs are 52, 57, 58, 60, 65, 66, 67, 75, 76, 89, 90).
MSG
