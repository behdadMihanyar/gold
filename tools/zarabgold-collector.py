#!/usr/bin/env python3
"""Hanzaei -> Gold dashboard price relay.
Install: python -m pip install playwright
         python -m playwright install chromium
Run:     python collector.py
Keep this program and its browser open. A SQLite outbox retries every update.
On a headless server, see deploy/collector-setup.sh to run this continuously under
a virtual display with a systemd service.

Signing in: save the Hanzaei account once on the dashboard's admin "Collector" page.
The collector keeps it in its own data folder (readable only by its user) and signs
in again by itself whenever Hanzaei logs it out. The same page also shows this
browser and lets an admin click/type into it by hand.
"""
import asyncio
import hmac
import json
import os
import re
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
LOGIN_URL = SOURCE + "/login"
IDS = {52, 57, 58, 60, 65, 66, 67, 75, 76, 89, 90}
DATA_DIR = Path(os.environ.get("ZARABGOLD_DATA_DIR") or os.environ.get("LOCALAPPDATA", str(Path.home()))) / "ZarabGoldWordPressRelay"
# Chromium's persistent profile (cookies, localStorage). Logging in to hanzaeigold.ir
# here is a one-time step — the session survives restarts and server reboots.
PROFILE_DIR = DATA_DIR / "chrome-profile"
# The Hanzaei account for automatic sign-in (written by the admin Collector page, mode 0600).
CREDENTIALS_FILE = DATA_DIR / "hanzaei-account.json"
# Headless Chromium is easy for sites to detect and block; on a server, run Chromium
# normally (headless=False) under a virtual display (Xvfb) instead — see deploy/collector-setup.sh.
HEADLESS = os.environ.get("ZARABGOLD_HEADLESS", "false").lower() == "true"
# Playwright's own browser download is blocked from some locations; deploy/collector-setup.sh
# installs the OS's Chromium package instead and points here, rather than relying on that CDN.
CHROMIUM_EXECUTABLE = os.environ.get("ZARABGOLD_CHROMIUM_EXECUTABLE") or None
# Local control port used by the dashboard's admin "Collector" page to show this browser
# and click/type into it (for the one-time hanzaeigold.ir login). 127.0.0.1 only; 0 = off.
CONTROL_PORT = int(os.environ.get("ZARABGOLD_CONTROL_PORT", "4100"))
# Watchdog (seconds): reload the price page when live prices have been down this long,
# at most this often, and not within this long of an admin clicking/typing on the
# Collector page (merely watching it doesn't count).
WATCHDOG_RELOAD_AFTER = 45
WATCHDOG_RELOAD_EVERY = 120
WATCHDOG_QUIET_AFTER_CONTROL = 120
# After the live connection was lost this long, the page's numbers can't be trusted:
# the page is reloaded and a fresh board read before prices count as live again.
STALE_AFTER_GAP = 5
# Automatic sign-in: wait this long after an admin's manual click/typing; retry
# failures with these growing delays; and if Hanzaei rejects the account, try it
# again only rarely (or when it is saved again) so the account is never locked out.
LOGIN_QUIET_AFTER_CONTROL = 20
LOGIN_RETRY_DELAYS = (20, 60, 120, 300, 600)
LOGIN_RETRY_REJECTED = 1800
# The board is re-read this often (seconds). Live websocket updates arrive instantly
# anyway; this catches anything the socket path misses within a second.
POLL_SECONDS = 1.0
HEARTBEAT_SECONDS = 10
# Keys the admin page may press; anything else is refused.
ALLOWED_KEYS = {"Enter", "Tab", "Backspace", "Delete", "Escape", "ArrowUp", "ArrowDown",
                "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"}


# Reads price text and non-secret connection state only.
VIEW_JS = """() => ({
  loginForm: !!document.querySelector('form input[name="password"]'),
  connected: !!window.Echo?.connector?.pusher?.allChannels().some(c => c.name.startsWith('private-Products.') && c.subscribed) && window.Echo?.connector?.pusher?.connection?.state === 'connected',
  rows: Array.from(document.querySelectorAll('[id^="product-card-"]')).filter(e => /^product-card-\\d+$/.test(e.id)).map(e => {
    const values = Array.from(e.querySelectorAll('a')).map(a => a.textContent.trim());
    // The product's name: the card's first text outside the price links that
    // isn't a number or a column label.
    const texts = [];
    const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.parentElement && n.parentElement.closest('a')) continue;
      const t = n.textContent.replace(/\\s+/g, ' ').trim();
      if (t) texts.push(t);
    }
    const name = texts.find(t => t.length <= 120 &&
      !/^[\\d\\u06F0-\\u06F9\\u0660-\\u0669\\u066C,.\\s]+$/.test(t) &&
      !['خرید', 'فروش', 'ندارید', 'قیمت خرید', 'قیمت فروش', 'ریال', 'تومان'].includes(t)) || null;
    return {id: Number(e.id.split('-').pop()), values, name};
  })
})"""


# Messages Hanzaei shows next to the login form after a failed attempt.
LOGIN_ERRORS_JS = """() => Array.from(document.querySelectorAll(
    '.invalid-feedback, .alert, .alert-danger, .text-danger, .help-block, .error, [role="alert"], .toast-message'))
  .filter(e => e.offsetParent !== null)
  .map(e => e.textContent.replace(/\\s+/g, ' ').trim())
  .filter(t => t && t.length < 300)
  .slice(0, 3)
  .join(' — ')"""


def latin_digits(text):
    return text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))


def mask_username(name):
    if not name:
        return None
    return name[:4] + "•" * max(len(name) - 6, 1) + name[-2:] if len(name) > 6 else name[:1] + "•" * (len(name) - 1)


class Account:
    """The saved Hanzaei account. Only this process and its OS user can read it;
    the password is never sent back out (state shows a masked username only)."""

    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.data = self._read()
        self.version = 0  # bumps on every save/clear so pending retries start over

    def _read(self):
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("username") and data.get("password"):
                return {"username": str(data["username"]), "password": str(data["password"])}
        except (OSError, ValueError):
            pass
        return None

    def get(self):
        with self.lock:
            return dict(self.data) if self.data else None

    def save(self, username, password):
        username = latin_digits(str(username)).strip()
        password = str(password)
        if not (3 <= len(username) <= 64) or not (1 <= len(password) <= 200):
            raise ValueError("bad account")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"username": username, "password": password}, f)
        os.replace(tmp, self.path)
        with self.lock:
            self.data = {"username": username, "password": password}
            self.version += 1

    def clear(self):
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass
        with self.lock:
            self.data = None
            self.version += 1

    def public(self):
        with self.lock:
            return {"configured": bool(self.data),
                    "username": mask_username(self.data["username"]) if self.data else None}


async def sign_in(page, account):
    """Fill and submit Hanzaei's login form. Returns ("ok"|"rejected"|"error", message)."""
    if not await page.query_selector('form input[name="password"]'):
        await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
        if not await page.query_selector('form input[name="password"]'):
            # Already signed in: /login sends a signed-in browser elsewhere.
            if not page.url.startswith(SOURCE) or "/login" in page.url:
                return "error", None
            await page.goto(SOURCE, wait_until="domcontentloaded", timeout=60000)
            return "ok", None
    await page.fill('form input[name="username"]', account["username"])
    await page.fill('form input[name="password"]', account["password"])
    # "Remember me" keeps the session for weeks, so sign-ins stay rare.
    await page.evaluate("""() => { const r = document.querySelector('form input[name="remember"]');
                                   if (r && !r.checked) r.click(); }""")
    submit = await page.query_selector('form button[type="submit"], form #submit')
    try:
        async with page.expect_navigation(wait_until="domcontentloaded", timeout=30000):
            if submit:
                await submit.click()
            else:
                await page.press('form input[name="password"]', "Enter")
    except Exception:
        pass  # no navigation: probably the form showed an error in place
    await page.wait_for_timeout(1500)
    if await page.query_selector('form input[name="password"]'):
        message = (await page.evaluate(LOGIN_ERRORS_JS)) or None
        # Never echo anything that could contain what was typed.
        if message and account["password"] in message:
            message = None
        return ("rejected" if message else "error"), message
    if not await page.query_selector('[id^="product-card-"]'):
        await page.goto(SOURCE, wait_until="domcontentloaded", timeout=60000)
    return "ok", None


def start_control_server(loop, current_page, status, token, port, activity):
    """Tiny HTTP API so the dashboard (admin only, via its own API) can drive this browser.

    GET  /state       {url, title, width, height, loggedIn, connected, rows, lastCheck}
    GET  /screenshot  JPEG of the visible page
    POST /click       {x, y}           page coordinates
    POST /type        {text}           types into the focused field
    POST /key         {key}            one of ALLOWED_KEYS
    POST /scroll      {dy}
    POST /home                         reopen hanzaeigold.ir
    POST /reload
    POST /account      {username, password}   save the account for automatic sign-in
    POST /account/clear                        forget it
    POST /login-now                            sign in now (also retries a rejected account)
    Every call needs the relay key in X-Qasr-Relay-Key (other local users can't use it).
    """
    account, login = status["_account"], status["_login"]
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
                    public = {k: v for k, v in status.items() if not k.startswith("_")}
                    auto = {k: v for k, v in login.items() if k in ("state", "message", "lastAttemptAt", "lastSuccessAt", "nextTryAt")}
                    return self.json(200, {**public, "url": page.url, "title": run(page.title()),
                                           "width": size["width"], "height": size["height"],
                                           "autoLogin": {**account.public(), **auto}})
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
            action = self.path.split("?")[0].strip("/")
            if action == "account":
                try:
                    account.save(body["username"], body["password"])
                except (KeyError, ValueError, TypeError):
                    return self.json(400, {"error": "bad account"})
                except OSError:
                    return self.json(503, {"error": "could not save"})
                login.update(wake=True, failures=0, state="pending", message=None)
                print("Hanzaei account saved; signing in.", flush=True)
                return self.json(200, {"ok": True})
            if action == "account/clear":
                account.clear()
                login.update(wake=False, failures=0, state="missing", message=None)
                print("Hanzaei account removed.", flush=True)
                return self.json(200, {"ok": True})
            if action == "login-now":
                if not account.get():
                    return self.json(400, {"error": "no account"})
                login.update(wake=True, failures=0, state="pending", message=None)
                return self.json(200, {"ok": True})
            page = current_page()
            activity["at"] = loop.time()  # an admin is driving the browser by hand
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
    seen_sockets = set()
    def attach(ws):
        # Ignore all sockets except the previously verified Hanzaei price endpoint.
        u = urlsplit(ws.url)
        where = "%s%s" % (u.hostname, u.path)  # never the query string
        if u.hostname != "goldmap.ir" or u.path != "/app/app-key-hanzaeigold":
            if where not in seen_sockets:
                seen_sockets.add(where)
                print("Ignoring websocket:", where, flush=True)
            return
        print("Live price socket attached.", flush=True)
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
        # A persistent profile starts with a tab already open, so listen on that one too —
        # context.on("page") only fires for tabs opened later.
        context.on("page", lambda pg: pg.on("websocket", attach))
        for existing in context.pages:
            existing.on("websocket", attach)
        page = context.pages[0] if context.pages else await context.new_page()
        sender_task = asyncio.create_task(sender())
        account = Account(CREDENTIALS_FILE)
        # Automatic sign-in state, shared with the control server (shown on the admin page).
        login = {"state": "idle" if account.get() else "missing", "message": None,
                 "lastAttemptAt": None, "lastSuccessAt": None, "nextTryAt": None,
                 "failures": 0, "wake": False, "retryAt": 0.0, "version": account.version}
        status = {"loggedIn": False, "connected": False, "rows": 0, "lastCheck": None,
                  "loginPage": False, "_account": account, "_login": login}
        activity = {"at": -1e9}
        control = None
        if CONTROL_PORT:
            def current_page():
                # The login flow may open a new tab; show the newest one still open.
                open_pages = [pg for pg in context.pages if not pg.is_closed()]
                return open_pages[-1] if open_pages else page
            try:
                control = start_control_server(asyncio.get_running_loop(), current_page, status, token, CONTROL_PORT, activity)
                print("Control page ready for the dashboard (127.0.0.1:%d)." % CONTROL_PORT, flush=True)
            except OSError as error:
                print("Control server not started:", error, flush=True)
        last_snapshot = None
        try:
            print("Opening Hanzaei.", flush=True)
            try:
                await page.goto(SOURCE, wait_until="domcontentloaded", timeout=60000)
            except Exception:
                print("Source navigation did not finish. Open https://www.hanzaeigold.ir in this browser and log in; the collector is still running.", flush=True)
            loop = asyncio.get_running_loop()
            last_connected = loop.time()
            last_reload = loop.time()
            last_heartbeat = 0.0
            failing_since = None
            # "fresh": the board was read from a page that has been connected the whole
            # time since. Only then are prices reported as live.
            fresh = False
            disconnected_since = loop.time()
            # True right after the page was (re)loaded: its board is current once connected.
            just_loaded = True
            reported = None  # last `connected` sent in a heartbeat

            def iso_in(seconds):
                return datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + seconds, timezone.utc).isoformat()

            async def maybe_sign_in(now):
                """Sign in again when Hanzaei shows its login form. Returns True if it tried."""
                creds = account.get()
                if login["version"] != account.version:
                    login.update(version=account.version, failures=0, retryAt=0.0)
                if not creds:
                    login.update(state="missing", nextTryAt=None)
                    return False
                if not login["wake"]:
                    if now < login["retryAt"]:
                        return False
                    if now - activity["at"] < LOGIN_QUIET_AFTER_CONTROL:
                        return False  # an admin is signing in by hand right now
                login.update(wake=False, state="working", message=None,
                             lastAttemptAt=datetime.now(timezone.utc).isoformat(), nextTryAt=None)
                print("Hanzaei shows its login page; signing in automatically.", flush=True)
                try:
                    result, message = await sign_in(page, creds)
                except Exception as error:
                    result, message = "error", None
                    print("Automatic sign-in failed:", type(error).__name__, flush=True)
                if result == "ok":
                    login.update(state="ok", message=None, failures=0, retryAt=0.0,
                                 lastSuccessAt=datetime.now(timezone.utc).isoformat())
                    print("Signed in to Hanzaei.", flush=True)
                elif result == "rejected":
                    login.update(state="rejected", message=message, retryAt=now + LOGIN_RETRY_REJECTED,
                                 nextTryAt=iso_in(LOGIN_RETRY_REJECTED))
                    print("Hanzaei did not accept the saved account; waiting before trying again.", flush=True)
                else:
                    login["failures"] += 1
                    delay = LOGIN_RETRY_DELAYS[min(login["failures"], len(LOGIN_RETRY_DELAYS)) - 1]
                    login.update(state="error", message=message, retryAt=now + delay, nextTryAt=iso_in(delay))
                    print("Sign-in did not finish; retrying in %ds." % delay, flush=True)
                return True

            def amount(text):
                digits = text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
                cleaned = ''.join(c for c in digits if c.isdigit())
                return int(cleaned) if cleaned else None

            while not page.is_closed():
                await asyncio.sleep(POLL_SECONDS)
                now = loop.time()
                heartbeat_due = now - last_heartbeat >= HEARTBEAT_SECONDS
                try:
                    view = await page.evaluate(VIEW_JS)
                    failing_since = None
                    on_login = bool(view["loginForm"])
                    connected = bool(view["connected"]) and not on_login
                    status.update(connected=connected, rows=len(view["rows"]), loginPage=on_login,
                                  loggedIn=not on_login and (bool(view["rows"]) or connected),
                                  lastCheck=datetime.now(timezone.utc).isoformat())

                    if connected:
                        if disconnected_since is not None:
                            gap = now - disconnected_since
                            disconnected_since = None
                            if gap >= STALE_AFTER_GAP and not just_loaded:
                                # Updates were missed while the socket was down: reload so the
                                # board shows current prices before they count as live again.
                                print("Live connection back after %ds; refreshing the board." % gap, flush=True)
                                fresh, last_snapshot, last_reload, just_loaded = False, None, now, True
                                disconnected_since = now
                                try:
                                    await page.reload(wait_until="domcontentloaded", timeout=60000)
                                except Exception:
                                    pass
                                continue
                        just_loaded = False
                    else:
                        disconnected_since = disconnected_since or now
                        if fresh and now - disconnected_since >= STALE_AFTER_GAP:
                            fresh, last_snapshot = False, None

                    if on_login:
                        # Signed out: prices stop counting as live before anything else.
                        fresh, last_snapshot = False, None
                        if reported is not False:
                            last_heartbeat, reported = now, False
                            enqueue({"kind": "heartbeat", "eventId": str(uuid.uuid4()), "connected": False})
                        if await maybe_sign_in(now):
                            fresh, last_snapshot, just_loaded = False, None, True
                            last_reload = last_connected = loop.time()
                            disconnected_since = disconnected_since or loop.time()
                            continue
                    elif login["state"] in ("idle", "missing", "pending") and connected and account.get():
                        login["state"] = "ok"

                    cards = [r for r in view["rows"] if r["id"] in IDS and len(r["values"]) == 2]
                    # A card caught mid-redraw has an empty value; wait for the next read
                    # rather than report a missing price.
                    if connected and cards and all(v.strip() for r in cards for v in r["values"]):
                        rows = [{"id": r["id"], "buy": amount(r["values"][0]), "sell": amount(r["values"][1]),
                                 **({"name": r["name"][:120]} if r.get("name") else {})}
                                for r in cards]
                        snapshot = json.dumps(rows, sort_keys=True)
                        # Only when the board changed: an unchanged read can't undo a newer
                        # websocket update that the page hasn't drawn yet.
                        if snapshot != last_snapshot:
                            enqueue({"kind": "snapshot", "eventId": str(uuid.uuid4()), "products": rows})
                            last_snapshot = snapshot
                        fresh = True

                    live = connected and fresh
                    # Report a change at once (prices hide/show within a second or two),
                    # and repeat the state every HEARTBEAT_SECONDS.
                    if heartbeat_due or live != reported:
                        last_heartbeat = now
                        reported = live
                        enqueue({"kind": "heartbeat", "eventId": str(uuid.uuid4()), "connected": live})
                        if connected:
                            last_connected = now
                        elif (not on_login and now - last_connected > WATCHDOG_RELOAD_AFTER
                              and now - last_reload > WATCHDOG_RELOAD_EVERY
                              and now - activity["at"] > WATCHDOG_QUIET_AFTER_CONTROL):
                            # Live prices stopped (network blip, socket dropped, site restarted):
                            # reload the page. Never while someone is using the admin Collector page.
                            print("Live connection lost; reloading the price page.", flush=True)
                            last_reload, just_loaded = now, True
                            try:
                                await page.reload(wait_until="domcontentloaded", timeout=60000)
                            except Exception:
                                pass
                except Exception:
                    fresh, last_snapshot = False, None
                    if heartbeat_due or reported is not False:
                        last_heartbeat = now
                        reported = False
                        enqueue({"kind": "heartbeat", "eventId": str(uuid.uuid4()), "connected": False})
                    failing_since = failing_since or now
                    if now - failing_since >= 60:
                        # The browser stopped answering for a minute: exit so systemd starts a fresh one.
                        print("Browser not responding; exiting so the service restarts it.", flush=True)
                        raise SystemExit(1)
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
