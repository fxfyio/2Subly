#!/usr/bin/env python3
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
import time
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "subly.db"

CURRENCY_CODES = {"CNY", "USD", "EUR", "GBP", "JPY", "HKD", "SGD", "AUD", "CAD", "PHP"}

SESSION_EXPIRE_DAYS = 14
PASSWORD_ITERATIONS = 180000

FX_CACHE_TTL_SECONDS = 30 * 60
FALLBACK_USD_RATES = {
  "USD": 1.0,
  "CNY": 7.2,
  "EUR": 0.93,
  "GBP": 0.79,
  "JPY": 150.0,
  "HKD": 7.8,
  "SGD": 1.35,
  "AUD": 1.53,
  "CAD": 1.35,
  "PHP": 56.0,
}
FX_CACHE = {
  "loaded_at": 0.0,
  "updated_at": "",
  "source": "fallback",
  "rates": FALLBACK_USD_RATES.copy(),
}

DEMO_SUBSCRIPTIONS = [
  ("ChatGPT Plus", "效率工具", 20.0, "USD", "monthly"),
  ("Spotify", "娱乐", 169.0, "PHP", "monthly"),
  ("Notion Plus", "效率工具", 10.0, "USD", "monthly"),
  ("Netflix", "娱乐", 68.0, "CNY", "monthly"),
  ("YouTube Premium", "娱乐", 11.0, "USD", "monthly"),
  ("iCloud+", "云服务", 21.0, "CNY", "monthly"),
  ("Microsoft 365", "办公", 398.0, "CNY", "yearly"),
  ("Canva Pro", "设计", 55.0, "CNY", "monthly"),
  ("GitHub Pro", "开发", 4.0, "USD", "monthly"),
  ("Cloudflare Pro", "云服务", 20.0, "USD", "monthly"),
]


def now_dt():
  return datetime.now(UTC)


def now_iso():
  return now_dt().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(dt_text):
  return datetime.fromisoformat(dt_text.replace("Z", "+00:00"))


def db_conn():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  return conn


def hash_password(password, salt_hex):
  salt = bytes.fromhex(salt_hex)
  digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
  return digest.hex()


def create_password_hash(password):
  salt_hex = secrets.token_hex(16)
  return salt_hex, hash_password(password, salt_hex)


def verify_password(password, salt_hex, digest_hex):
  calc = hash_password(password, salt_hex)
  return hmac.compare_digest(calc, digest_hex)


def seed_demo_subscriptions_for_user(conn, user_id):
  today = datetime.now().date().isoformat()
  now = now_iso()
  rows = []
  for idx, item in enumerate(DEMO_SUBSCRIPTIONS, start=1):
    name, category, price, currency, cycle = item
    rows.append(
      (
        f"{user_id}_demo_{idx}",
        user_id,
        name,
        category,
        price,
        currency,
        "",
        cycle,
        today,
        "active",
        "",
        "[]",
        now,
        now,
      )
    )
  conn.executemany(
    """
    INSERT INTO subscriptions (
      id, user_id, name, category, price, currency, icon_url, cycle, next_payment_date, status, note, tags, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    rows,
  )


def init_db():
  with db_conn() as conn:
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
      """
    )
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
      """
    )
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'CNY',
        icon_url TEXT DEFAULT '',
        cycle TEXT NOT NULL,
        next_payment_date TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
      """
    )

    columns = {r["name"] for r in conn.execute("PRAGMA table_info(subscriptions)").fetchall()}
    if "currency" not in columns:
      conn.execute("ALTER TABLE subscriptions ADD COLUMN currency TEXT NOT NULL DEFAULT 'CNY'")
      conn.execute("UPDATE subscriptions SET currency = 'CNY' WHERE currency IS NULL OR currency = ''")
    if "icon_url" not in columns:
      conn.execute("ALTER TABLE subscriptions ADD COLUMN icon_url TEXT DEFAULT ''")
      conn.execute("UPDATE subscriptions SET icon_url = '' WHERE icon_url IS NULL")
    if "user_id" not in columns:
      conn.execute("ALTER TABLE subscriptions ADD COLUMN user_id TEXT")
    if "tags" not in columns:
      conn.execute("ALTER TABLE subscriptions ADD COLUMN tags TEXT DEFAULT '[]'")
      conn.execute("UPDATE subscriptions SET tags = '[]' WHERE tags IS NULL OR tags = ''")

    conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (now_iso(),))


def normalize_currency(value):
  code = (value or "CNY").strip().upper()
  if code not in CURRENCY_CODES:
    return None
  return code


def normalize_payload(payload):
  currency = normalize_currency(payload.get("currency"))
  if currency is None:
    return None, "Invalid currency"

  try:
    price = float(payload["price"])
  except (ValueError, TypeError, KeyError):
    return None, "Invalid price"
  if price < 0:
    return None, "Invalid price"

  try:
    raw_tags = payload.get("tags", [])
    if isinstance(raw_tags, str):
      raw_tags = [raw_tags]
    if not isinstance(raw_tags, list):
      raw_tags = []
    tags = []
    seen = set()
    for item in raw_tags:
      text = str(item).strip()
      if not text:
        continue
      lowered = text.lower()
      if lowered in seen:
        continue
      seen.add(lowered)
      tags.append(text[:24])

    normalized = {
      "id": payload["id"],
      "name": payload["name"].strip(),
      "category": payload["category"].strip(),
      "price": price,
      "currency": currency,
      "iconUrl": (payload.get("iconUrl") or "").strip(),
      "cycle": payload["cycle"],
      "nextPaymentDate": payload["nextPaymentDate"],
      "status": payload["status"],
      "note": (payload.get("note") or "").strip(),
      "tags": tags[:8],
    }
  except KeyError:
    return None, "Missing fields"
  return normalized, None


def row_to_json(row):
  tags_raw = row["tags"] if "tags" in row.keys() else "[]"
  try:
    tags = json.loads(tags_raw) if tags_raw else []
  except (TypeError, ValueError, json.JSONDecodeError):
    tags = []
  if not isinstance(tags, list):
    tags = []
  return {
    "id": row["id"],
    "name": row["name"],
    "category": row["category"],
    "price": row["price"],
    "currency": row["currency"],
    "iconUrl": row["icon_url"] or "",
    "cycle": row["cycle"],
    "nextPaymentDate": row["next_payment_date"],
    "status": row["status"],
    "note": row["note"] or "",
    "tags": [str(t) for t in tags if str(t).strip()],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
  }


def fetch_live_usd_rates():
  symbols = sorted([c for c in CURRENCY_CODES if c != "USD"])
  symbol_query = ",".join(symbols)
  url = f"https://api.frankfurter.app/latest?from=USD&to={symbol_query}"
  with urlopen(url, timeout=6) as resp:
    payload = json.loads(resp.read().decode("utf-8"))

  rates = {"USD": 1.0}
  payload_rates = payload.get("rates", {})
  for code in CURRENCY_CODES:
    if code == "USD":
      continue
    val = payload_rates.get(code)
    if val is None:
      raise ValueError(f"missing rate for {code}")
    rates[code] = float(val)
  return {
    "updated_at": payload.get("date") or datetime.now(UTC).date().isoformat(),
    "source": "frankfurter",
    "rates": rates,
  }


def get_usd_rates():
  now = time.time()
  cache_age = now - FX_CACHE["loaded_at"]
  if FX_CACHE["loaded_at"] and cache_age < FX_CACHE_TTL_SECONDS:
    return {
      "base": "USD",
      "rates": FX_CACHE["rates"],
      "updatedAt": FX_CACHE["updated_at"],
      "source": FX_CACHE["source"],
      "stale": False,
    }

  try:
    fresh = fetch_live_usd_rates()
    FX_CACHE["loaded_at"] = now
    FX_CACHE["updated_at"] = fresh["updated_at"]
    FX_CACHE["source"] = fresh["source"]
    FX_CACHE["rates"] = fresh["rates"]
    return {
      "base": "USD",
      "rates": FX_CACHE["rates"],
      "updatedAt": FX_CACHE["updated_at"],
      "source": FX_CACHE["source"],
      "stale": False,
    }
  except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
    stale = FX_CACHE["loaded_at"] > 0
    if not stale:
      FX_CACHE["loaded_at"] = now
      FX_CACHE["updated_at"] = datetime.now(UTC).date().isoformat()
      FX_CACHE["source"] = "fallback"
      FX_CACHE["rates"] = FALLBACK_USD_RATES.copy()
    return {
      "base": "USD",
      "rates": FX_CACHE["rates"],
      "updatedAt": FX_CACHE["updated_at"],
      "source": FX_CACHE["source"],
      "stale": True,
    }


class Handler(BaseHTTPRequestHandler):
  def _send_json(self, status_code, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    self.send_response(status_code)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def _send_text_file(self, file_path, content_type):
    if not file_path.exists() or not file_path.is_file():
      self.send_error(404, "Not Found")
      return
    body = file_path.read_bytes()
    self.send_response(200)
    self.send_header("Content-Type", content_type)
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def _read_json_body(self):
    length = int(self.headers.get("Content-Length", 0))
    raw = self.rfile.read(length) if length > 0 else b"{}"
    try:
      return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
      return None

  def _auth_user(self):
    auth = self.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
      return None
    token = auth[len("Bearer "):].strip()
    if not token:
      return None
    with db_conn() as conn:
      row = conn.execute(
        """
        SELECT u.id, u.username, s.expires_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
      ).fetchone()
      if not row:
        return None
      if parse_iso(row["expires_at"]) <= now_dt():
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return None
      return {"id": row["id"], "username": row["username"], "token": token}

  def _require_auth(self):
    user = self._auth_user()
    if not user:
      self._send_json(401, {"error": "Unauthorized"})
      return None
    return user

  def _handle_auth_register(self, payload):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if len(username) < 3:
      self._send_json(400, {"error": "Username too short"})
      return
    if len(password) < 6:
      self._send_json(400, {"error": "Password too short"})
      return

    user_id = secrets.token_hex(8)
    salt_hex, pass_hex = create_password_hash(password)
    created = now_iso()
    token = secrets.token_urlsafe(32)
    expires = (now_dt() + timedelta(days=SESSION_EXPIRE_DAYS)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    try:
      with db_conn() as conn:
        conn.execute(
          "INSERT INTO users (id, username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
          (user_id, username, salt_hex, pass_hex, created),
        )
        conn.execute(
          "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
          (token, user_id, created, expires),
        )
        seed_demo_subscriptions_for_user(conn, user_id)
    except sqlite3.IntegrityError:
      self._send_json(409, {"error": "Username already exists"})
      return

    self._send_json(201, {"token": token, "user": {"id": user_id, "username": username}})

  def _handle_auth_login(self, payload):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    with db_conn() as conn:
      user = conn.execute(
        "SELECT id, username, password_salt, password_hash FROM users WHERE username = ?",
        (username,),
      ).fetchone()
      if not user:
        self._send_json(401, {"error": "Invalid credentials"})
        return
      if not verify_password(password, user["password_salt"], user["password_hash"]):
        self._send_json(401, {"error": "Invalid credentials"})
        return
      token = secrets.token_urlsafe(32)
      created = now_iso()
      expires = (now_dt() + timedelta(days=SESSION_EXPIRE_DAYS)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
      conn.execute(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user["id"], created, expires),
      )
    self._send_json(200, {"token": token, "user": {"id": user["id"], "username": user["username"]}})

  def _handle_auth_change_password(self, user, payload):
    old_password = payload.get("oldPassword") or ""
    new_password = payload.get("newPassword") or ""
    if len(new_password) < 6:
      self._send_json(400, {"error": "New password too short"})
      return

    with db_conn() as conn:
      row = conn.execute(
        "SELECT password_salt, password_hash FROM users WHERE id = ?",
        (user["id"],),
      ).fetchone()
      if not row:
        self._send_json(404, {"error": "User not found"})
        return
      if not verify_password(old_password, row["password_salt"], row["password_hash"]):
        self._send_json(401, {"error": "Current password is incorrect"})
        return

      salt_hex, pass_hex = create_password_hash(new_password)
      conn.execute(
        "UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?",
        (salt_hex, pass_hex, user["id"]),
      )
    self._send_json(200, {"ok": True})

  def do_GET(self):
    parsed = urlparse(self.path)
    path = parsed.path
    query = parse_qs(parsed.query)

    if path == "/api/auth/me":
      user = self._require_auth()
      if not user:
        return
      self._send_json(200, {"user": {"id": user["id"], "username": user["username"]}})
      return

    if path == "/api/subscriptions":
      user = self._require_auth()
      if not user:
        return
      with db_conn() as conn:
        rows = conn.execute(
          """
          SELECT id, name, category, price, currency, icon_url, cycle, next_payment_date, status, note, created_at, updated_at
          , tags
          FROM subscriptions
          WHERE user_id = ?
          ORDER BY next_payment_date ASC
          """,
          (user["id"],),
        ).fetchall()
      self._send_json(200, [row_to_json(r) for r in rows])
      return

    if path == "/api/rates":
      requested_base = (query.get("base", ["USD"])[0] or "USD").upper()
      rates_payload = get_usd_rates()
      rates_payload["requestedBase"] = requested_base
      self._send_json(200, rates_payload)
      return

    static_map = {
      "/": ("index.html", "text/html; charset=utf-8"),
      "/index.html": ("index.html", "text/html; charset=utf-8"),
      "/app.js": ("app.js", "application/javascript; charset=utf-8"),
      "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    }
    if path in static_map:
      rel, ctype = static_map[path]
      self._send_text_file(BASE_DIR / rel, ctype)
      return

    if path.startswith("/assets/"):
      rel = path.lstrip("/")
      file_path = BASE_DIR / rel
      try:
        file_path.relative_to(BASE_DIR)
      except ValueError:
        self.send_error(403, "Forbidden")
        return
      ctype = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
      if ctype.startswith("text/") or ctype in {"image/svg+xml", "application/javascript"}:
        ctype = f"{ctype}; charset=utf-8" if "charset" not in ctype else ctype
      self._send_text_file(file_path, ctype)
      return

    self.send_error(404, "Not Found")

  def do_POST(self):
    parsed = urlparse(self.path)

    if parsed.path == "/api/auth/register":
      payload = self._read_json_body()
      if payload is None:
        self._send_json(400, {"error": "Invalid JSON"})
        return
      self._handle_auth_register(payload)
      return

    if parsed.path == "/api/auth/login":
      payload = self._read_json_body()
      if payload is None:
        self._send_json(400, {"error": "Invalid JSON"})
        return
      self._handle_auth_login(payload)
      return

    if parsed.path == "/api/auth/logout":
      user = self._require_auth()
      if not user:
        return
      with db_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (user["token"],))
      self._send_json(200, {"ok": True})
      return

    if parsed.path == "/api/auth/change-password":
      user = self._require_auth()
      if not user:
        return
      payload = self._read_json_body()
      if payload is None:
        self._send_json(400, {"error": "Invalid JSON"})
        return
      self._handle_auth_change_password(user, payload)
      return

    if parsed.path != "/api/subscriptions":
      self.send_error(404, "Not Found")
      return

    user = self._require_auth()
    if not user:
      return

    payload = self._read_json_body()
    if payload is None:
      self._send_json(400, {"error": "Invalid JSON"})
      return

    normalized, err = normalize_payload(payload)
    if err is not None:
      self._send_json(400, {"error": err})
      return

    ts = now_iso()
    try:
      with db_conn() as conn:
        conn.execute(
          """
          INSERT INTO subscriptions (
            id, user_id, name, category, price, currency, icon_url, cycle, next_payment_date, status, note, tags, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            normalized["id"],
            user["id"],
            normalized["name"],
            normalized["category"],
            normalized["price"],
            normalized["currency"],
            normalized["iconUrl"],
            normalized["cycle"],
            normalized["nextPaymentDate"],
            normalized["status"],
            normalized["note"],
            json.dumps(normalized["tags"], ensure_ascii=False),
            ts,
            ts,
          ),
        )
    except sqlite3.IntegrityError:
      self._send_json(409, {"error": "ID already exists"})
      return

    self._send_json(201, {"ok": True})

  def do_PUT(self):
    parsed = urlparse(self.path)
    parts = parsed.path.split("/")
    if len(parts) != 4 or parts[:3] != ["", "api", "subscriptions"]:
      self.send_error(404, "Not Found")
      return

    user = self._require_auth()
    if not user:
      return

    sub_id = parts[3]
    payload = self._read_json_body()
    if payload is None:
      self._send_json(400, {"error": "Invalid JSON"})
      return

    normalized, err = normalize_payload(payload)
    if err is not None:
      self._send_json(400, {"error": err})
      return

    ts = now_iso()
    with db_conn() as conn:
      cur = conn.execute(
        """
        UPDATE subscriptions
        SET name = ?, category = ?, price = ?, currency = ?, icon_url = ?, cycle = ?, next_payment_date = ?, status = ?, note = ?, tags = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
        """,
        (
          normalized["name"],
          normalized["category"],
          normalized["price"],
          normalized["currency"],
          normalized["iconUrl"],
          normalized["cycle"],
          normalized["nextPaymentDate"],
          normalized["status"],
          normalized["note"],
          json.dumps(normalized["tags"], ensure_ascii=False),
          ts,
          sub_id,
          user["id"],
        ),
      )
    if cur.rowcount == 0:
      self._send_json(404, {"error": "Not found"})
      return

    self._send_json(200, {"ok": True})

  def do_DELETE(self):
    parsed = urlparse(self.path)
    parts = parsed.path.split("/")
    if len(parts) != 4 or parts[:3] != ["", "api", "subscriptions"]:
      self.send_error(404, "Not Found")
      return

    user = self._require_auth()
    if not user:
      return

    sub_id = parts[3]
    with db_conn() as conn:
      cur = conn.execute("DELETE FROM subscriptions WHERE id = ? AND user_id = ?", (sub_id, user["id"]))
    if cur.rowcount == 0:
      self._send_json(404, {"error": "Not found"})
      return
    self._send_json(200, {"ok": True})


def main():
  init_db()
  host = "127.0.0.1"
  port = int(os.environ.get("PORT", "5173"))
  server = ThreadingHTTPServer((host, port), Handler)
  print(f"Serving on http://{host}:{port}")
  server.serve_forever()


if __name__ == "__main__":
  main()
