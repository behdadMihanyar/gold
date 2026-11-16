#!/usr/bin/env python3
"""Hanzaei -> Gold dashboard price relay (adapted from the WordPress collector). Login happens in your local browser only.
Install: python -m pip install playwright
         python -m playwright install chromium
Run:     python collector.py
Keep this program and its browser open. A SQLite outbox retries every update.
On a headless server, see deploy/collector-setup.sh to run this continuously under
a virtual display with a systemd service. Log in once from the dashboard's admin
"Collector" page, which shows this browser and lets you click/type into it.
"""
import asyncio
import hmac
import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit

# Where to send prices and the shared secret. Never write the key into this file:
#   ZARABGOLD_ENDPOINT   e.g. http://94.20.159.223/api/prices/ingest
#   ZARABGOLD_RECEIVER_KEY   the PRICE_RELAY_KEY from server/.env
CONFIG = {"endpoint": os.environ.get("ZARABGOLD_ENDPOINT", ""), "token": ""}
SOURCE = "https://www.hanzaeigold.ir"
IDS = {52, 57, 58, 60, 65, 66, 67, 75, 76, 89, 90}
DATA_DIR = Path(os.environ.get("ZARABGOLD_DATA_DIR") or os.environ.get("LOCALAPPDATA", str(Path.home()))) / "ZarabGoldWordPressRelay"
# Chromium's persistent profile (cookies, localStorage). Logging in to hanzaeigold.ir
# here is a one-time step — the session survives restarts and server reboots.
PROFILE_DIR = DATA_DIR / "chrome-profile"
# Headless Chromium is easy for sites to detect and block; on a server, run Chromium
# normally (headless=False) under a virtual display (Xvfb) instead — see deploy/collector-setup.sh.
HEADLESS = os.environ.get("ZARABGOLD_HEADLESS", "false").lower() == "true"
# Playwright's own browser download is blocked from some locations; deploy/collector-setup.sh
# installs the OS's Chromium package instead and points here, rather than relying on that CDN.
CHROMIUM_EXECUTABLE = os.environ.get("ZARABGOLD_CHROMIUM_EXECUTABLE") or None
# Local control port used by the dashboard's admin "Collector" page to show this browser
# and click/type into it (for the one-time hanzaeigold.ir login). 127.0.0.1 only; 0 = off.
CONTROL_PORT = int(os.environ.get("ZARABGOLD_CONTROL_PORT", "4100"))
# Keys the admin page may press; anything else is refused.
ALLOWED_KEYS = {"Enter", "Tab", "Backspace", "Delete", "Escape", "ArrowUp", "ArrowDown",
                "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"}


def start_control_server(loop, current_page, status, token, port):
    """Tiny HTTP API so the dashboard (admin only, via its own API) can drive this browser.

    GET  /state       {url, title, width, height, loggedIn, connected, rows, lastCheck}
    GET  /screenshot  JPEG of the visible page
    POST /click       {x, y}           page coordinates
    POST /type        {text}           types into the focused field
    POST /key         {key}            one of ALLOWED_KEYS
    POST /scroll      {dy}
    POST /home                         reopen hanzaeigold.ir
    POST /reload
    Every call needs the relay key in X-Qasr-Relay-Key (other local users can't use it).
    """
    def run(coro, timeout=25):
        return asyncio.run_coroutine_threadsafe(coro, loop).result(timeout)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # keep the journal free of request noise
            pass

        def send(self, code, body=b"", ctype="application/json"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def json(self, code, data):
            self.send(code, json.dumps(data, ensure_ascii=False).encode())

        def authorized(self):
            given = self.headers.get("X-Qasr-Relay-Key", "")
            if hmac.compare_digest(given.encode(), token.encode()):
                return True
            self.json(401, {"error": "unauthorized"})
            return False

        def do_GET(self):
            if not self.authorized():
                return
            page = current_page()
            try:
                if self.path.split("?")[0] == "/screenshot":
                    return self.send(200, run(page.screenshot(type="jpeg", quality=70)), "image/jpeg")
                if self.path.split("?")[0] == "/state":
                    size = page.viewport_size or {"width": 1280, "height": 720}
                    return self.json(200, {**status, "url": page.url, "title": run(page.title()),
                                           "width": size["width"], "height": size["height"]})
                self.json(404, {"error": "not found"})
            except Exception as error:
                self.json(503, {"error": type(error).__name__})

        def do_POST(self):
            if not self.authorized():
                return
            try:
                length = min(int(self.headers.get("Content-Length") or 0), 10000)
                body = json.loads(self.rfile.read(length) or b"{}")
                if not isinstance(body, dict):
                    raise ValueError
            except ValueError:
                return self.json(400, {"error": "bad json"})
            page = current_page()
            action = self.path.split("?")[0].strip("/")
            try:
                if action == "click":
                    run(page.mouse.click(float(body["x"]), float(body["y"])))
                elif action == "type":
                    text = str(body.get("text", ""))[:500]
                    run(page.keyboard.type(text, delay=25))
                elif action == "key":
                    if body.get("key") not in ALLOWED_KEYS:
                        return self.json(400, {"error": "key not allowed"})
                    run(page.keyboard.press(body["key"]))
                elif action == "scroll":
                    run(page.mouse.wheel(0, max(-3000, min(3000, float(body.get("dy", 0))))))
                elif action == "home":
                    # Only ever the price source — never an arbitrary URL.
                    run(page.goto(SOURCE, wait_until="domcontentloaded", timeout=60000), timeout=65)
                elif action == "reload":
                    run(page.reload(wait_until="domcontentloaded", timeout=60000), timeout=65)
                else:
                    return self.json(404, {"error": "not found"})
                self.json(200, {"ok": True})
            except (KeyError, TypeError, ValueError):
                self.json(400, {"error": "bad request"})
            except Exception as error:
                self.json(503, {"error": type(error).__name__})

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server

def receiver_endpoint(config):
    # Older WordPress downloads inserted JSON slash escapes into Python literals.
    endpoint = config["endpoint"].replace("\\/", "/")
    parsed = urlsplit(endpoint)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Set ZARABGOLD_ENDPOINT to your server, e.g. http://94.20.159.223/api/prices/ingest")
    return endpoint

def delivery_error(error):
    # Do not print request bodies, headers, tokens, or server response pages.
    if isinstance(error, HTTPError):
        tips = {401: "Download a fresh collector from WordPress.",
                403: "Your WordPress host/security service blocked the receiver request.",
                404: "Check plugin activation and WordPress REST routes."}
        return "HTTP %s. %s" % (error.code, tips.get(error.code, "The receiver returned an error."))
    if isinstance(error, URLError):
        return "Network/TLS connection failed. Check internet access and the receiver HTTPS certificate."
    return "Receiver did not acknowledge the update as JSON with ok=true."

def parse_frame(frame):
    try:
        msg = json.loads(frame)
        if msg.get("event") != "App\\Events\\ProductUpdated":
            return None
        data = msg.get("data")
        if isinstance(data, str):
            data = json.loads(data)
        if not isinstance(data, dict) or int(data.get("productId", 0)) not in IDS:
            return None
        # Only price fields leave the source browser. No account, cookie or auth data.
        row = {"id": int(data["productId"])}
        for source, target in [("yourBuyPrice", "buy"), ("yourSellprice", "sell")]:
            if source in data:
                value = data[source]
                if isinstance(value, str):
                    value = int(value.replace(',', '').strip())
                row[target] = value
        if len(row) == 1:
            return None
        return {"eventId": str(uuid.uuid4()), "kind": "update", "products": [row]}
    except (ValueError, TypeError, KeyError):
        return None

async def main():
    token = os.environ.get("ZARABGOLD_RECEIVER_KEY", CONFIG["token"])
    if not token:
        raise SystemExit("Set ZARABGOLD_RECEIVER_KEY to the PRICE_RELAY_KEY value from server/.env on the server.")
    endpoint = receiver_endpoint(CONFIG)
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise SystemExit("Missing Playwright. Run: python -m pip install playwright\nThen: python -m playwright install chromium")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATA_DIR / "outbox.sqlite3")
    conn.execute("CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)")
    conn.execute("CREATE TABLE IF NOT EXISTS rejected (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, status INTEGER NOT NULL)")
    conn.commit()
    def enqueue(payload):
        payload['observedAt'] = datetime.now(timezone.utc).isoformat()
        conn.execute("INSERT INTO outbox(payload) VALUES (?)", (json.dumps(payload),))
        conn.commit()
    def post(payload):
        req = Request(endpoint, data=payload.encode(),
            headers={"Content-Type":"application/json", "Accept":"application/json",
                     "User-Agent":"ZarabGoldCollector/2.0.1", "X-Qasr-Relay-Key":token}, method="POST")
        with urlopen(req, timeout=20) as response:
            result = json.load(response)
            if response.status != 200 or not isinstance(result, dict) or result.get("ok") is not True:
                raise RuntimeError("Price relay rejected")
    async def sender():
        delay = 1
        while True:
            row = conn.execute("SELECT id,payload FROM outbox ORDER BY id LIMIT 1").fetchone()
            if not row:
                await asyncio.sleep(.15)
                continue
            try:
                await asyncio.to_thread(post, row[1])
                conn.execute("DELETE FROM outbox WHERE id=?", (row[0],))
                conn.commit()
                print("Delivered update to the dashboard.", flush=True)
                delay = 1
            except Exception as error:
                code = getattr(error, "code", None)
                if code in (400, 413):
                    conn.execute("INSERT OR REPLACE INTO rejected VALUES (?,?,?)", (row[0], row[1], code))
                    conn.execute("DELETE FROM outbox WHERE id=?", (row[0],))
                    conn.commit()
                    print("Invalid event kept in rejected outbox; continuing. HTTP:", code, flush=True)
                    continue
                print("Delivery paused; retrying:", delivery_error(error), flush=True)
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
    def attach(ws):
        # Ignore all sockets except the previously verified Hanzaei price endpoint.
        from urllib.parse import urlsplit
        u = urlsplit(ws.url)
        if u.hostname != "goldmap.ir" or u.path != "/app/app-key-hanzaeigold":
            return
        def received(frame):
            data = parse_frame(frame)
            if data:
                enqueue(data)
                print("Price update queued:", data["products"][0]["id"], flush=True)
        ws.on("framereceived", received)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        # A persistent context keeps the hanzaeigold.ir login across restarts: log in once
        # (see deploy/collector-setup.sh), and every later run reuses that same browser profile.
        context = await p.chromium.launch_persistent_context(
            str(PROFILE_DIR), headless=HEADLESS, executable_path=CHROMIUM_EXECUTABLE,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context.on("page", lambda page: page.on("websocket", attach))
        page = context.pages[0] if context.pages else await context.new_page()
        sender_task = asyncio.create_task(sender())
        status = {"loggedIn": False, "connected": False, "rows": 0, "lastCheck": None}
        control = None
        if CONTROL_PORT:
            def current_page():
                # The login flow may open a new tab; show the newest one still open.
                open_pages = [pg for pg in context.pages if not pg.is_closed()]
                return open_pages[-1] if open_pages else page
            try:
                control = start_control_server(asyncio.get_running_loop(), current_page, status, token, CONTROL_PORT)
                print("Control page ready for the dashboard (127.0.0.1:%d)." % CONTROL_PORT, flush=True)
            except OSError as error:
                print("Control server not started:", error, flush=True)
        ticks = 0
        last_snapshot = None
        try:
            print("Opening Hanzaei. Log in normally in the browser. Credentials stay in that browser.", flush=True)
            try:
                await page.goto(SOURCE, wait_until="domcontentloaded", timeout=60000)
            except Exception:
                print("Source navigation did not finish. Open https://www.hanzaeigold.ir in this browser and log in; the collector is still running.", flush=True)
            while not page.is_closed():
                await asyncio.sleep(10)
                try:
                    # Read price text and non-secret connection state only.
                    view = await page.evaluate("""() => ({
                      connected: !!window.Echo?.connector?.pusher?.allChannels().some(c => c.name.startsWith('private-Products.') && c.subscribed) && window.Echo?.connector?.pusher?.connection?.state === 'connected',
                      rows: Array.from(document.querySelectorAll('[id^="product-card-"]')).filter(e => /^product-card-\\d+$/.test(e.id)).map(e => ({id: Number(e.id.split('-').pop()), values: Array.from(e.querySelectorAll('a')).map(a => a.textContent.trim())}))
                    })""")
                    status.update(connected=bool(view["connected"]), rows=len(view["rows"]),
                                  loggedIn=bool(view["rows"]) or bool(view["connected"]),
                                  lastCheck=datetime.now(timezone.utc).isoformat())
                    if ticks % 3 == 0 and view["rows"]:
                        def amount(text):
                            digits = text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
                            cleaned = ''.join(c for c in digits if c.isdigit())
                            return int(cleaned) if cleaned else None
                        rows = [{"id":r["id"], "buy":amount(r["values"][0]), "sell":amount(r["values"][1])}
                                for r in view["rows"] if r["id"] in IDS and len(r["values"]) == 2]
                        snapshot = json.dumps(rows, sort_keys=True)
                        if rows and snapshot != last_snapshot:
                            enqueue({"kind":"snapshot", "eventId":str(uuid.uuid4()), "products":rows})
                            last_snapshot = snapshot
                    enqueue({"kind":"heartbeat", "eventId":str(uuid.uuid4()), "connected":bool(view["connected"])})
                    ticks += 1
                except Exception:
                    enqueue({"kind":"heartbeat", "eventId":str(uuid.uuid4()), "connected":False})
        finally:
            if control:
                control.shutdown()
            sender_task.cancel()
            await asyncio.gather(sender_task, return_exceptions=True)
            await context.close()
            conn.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stopped. Undelivered prices remain in the local outbox.")
