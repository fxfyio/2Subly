#!/usr/bin/env python3
import hashlib
import hmac
import base64
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import subprocess
import time
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen

BASE_DIR = Path(__file__).resolve().parent
DB_PATH_RAW = os.environ.get("DB_PATH", "subly.db")
DB_PATH = Path(DB_PATH_RAW)
if not DB_PATH.is_absolute():
  DB_PATH = (BASE_DIR / DB_PATH).resolve()
SUPER_ADMIN_USERNAME = os.environ.get("SUPER_ADMIN_USERNAME", "superadmin")
SUPER_ADMIN_PASSWORD = os.environ.get("SUPER_ADMIN_PASSWORD", "Subly@123456")

CURRENCY_CODES = {"CNY", "TWD", "USD", "EUR", "GBP", "JPY", "HKD", "SGD", "AUD", "CAD", "PHP"}

SESSION_EXPIRE_DAYS = 14
PASSWORD_ITERATIONS = 180000

FX_CACHE_TTL_SECONDS = 30 * 60
ICON_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60
FALLBACK_USD_RATES = {
  "USD": 1.0,
  "CNY": 7.2,
  "TWD": 32.0,
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
  "missing_codes": sorted(CURRENCY_CODES),
}
OPEN_ER_CACHE = {
  "loaded_at": 0.0,
  "rates": {},
}
CURRENCY_NAME_CACHE = {
  "loaded_at": 0.0,
  "names": {},
}

SERVICE_ICON_HINTS = [
  {"keyword": "chatgpt", "domain": "chatgpt.com", "icon": "https://cdn.jsdelivr.net/npm/simple-icons/icons/openai.svg"},
  {"keyword": "openai", "domain": "openai.com", "icon": "https://cdn.jsdelivr.net/npm/simple-icons/icons/openai.svg"},
  {"keyword": "汽水音乐", "domain": "music.douyin.com", "icon": "https://cdn.simpleicons.org/tiktok/000000"},
  {"keyword": "抖音", "domain": "douyin.com", "icon": "https://cdn.simpleicons.org/tiktok/000000"},
  {"keyword": "qq音乐", "domain": "y.qq.com", "icon": "https://cdn.simpleicons.org/tencentqq/12B7F5"},
  {"keyword": "网易云音乐", "domain": "music.163.com", "icon": "https://cdn.simpleicons.org/neteasecloudmusic/D43C33"},
  {"keyword": "spotify", "domain": "spotify.com", "icon": "https://cdn.simpleicons.org/spotify/1DB954"},
  {"keyword": "youtube", "domain": "youtube.com", "icon": "https://cdn.simpleicons.org/youtube/FF0000"},
  {"keyword": "netflix", "domain": "netflix.com", "icon": "https://cdn.simpleicons.org/netflix/E50914"},
  {"keyword": "notion", "domain": "notion.so", "icon": "https://cdn.simpleicons.org/notion/000000"},
  {"keyword": "github", "domain": "github.com", "icon": "https://cdn.simpleicons.org/github/181717"},
  {"keyword": "icloud", "domain": "icloud.com", "icon": "https://cdn.simpleicons.org/icloud/3693F3"},
  {"keyword": "cloudflare", "domain": "cloudflare.com", "icon": "https://cdn.simpleicons.org/cloudflare/F38020"},
  {"keyword": "microsoft", "domain": "microsoft.com", "icon": "https://cdn.jsdelivr.net/npm/simple-icons/icons/microsoft.svg"},
  {"keyword": "canva", "domain": "canva.com", "icon": "https://cdn.jsdelivr.net/npm/simple-icons/icons/canva.svg"},
]
SERVICE_NAME_ALIASES = {
  "汽水音乐": ["tiktok", "douyin", "musicdouyin"],
  "抖音": ["tiktok", "douyin"],
  "飞书": ["lark", "feishu"],
  "钉钉": ["dingtalk"],
  "腾讯会议": ["voovmeeting", "tencentmeeting"],
  "微信读书": ["wechat"],
  "网易云音乐": ["neteasecloudmusic"],
  "qq音乐": ["qqmusic", "tencentqq"],
  "b站": ["bilibili"],
  "哔哩哔哩": ["bilibili"],
}
UPLOAD_DIR = BASE_DIR / "assets" / "uploads"
ALLOWED_UPLOAD_MIME = {
  "image/png": ".png",
  "image/jpg": ".jpg",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
}
MAX_ICON_UPLOAD_BYTES = 1024 * 1024

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


def prepare_db_path():
  global DB_PATH
  candidates = [DB_PATH]
  fallback = Path("/tmp/subly.db")
  if fallback not in candidates:
    candidates.append(fallback)

  last_err = None
  for candidate in candidates:
    try:
      candidate.parent.mkdir(parents=True, exist_ok=True)
      probe = candidate.parent / ".subly_write_probe"
      with probe.open("a", encoding="utf-8"):
        pass
      try:
        probe.unlink()
      except OSError:
        pass
      if candidate != DB_PATH:
        print(f"[WARN] DB path '{DB_PATH}' not writable, fallback to '{candidate}'")
      DB_PATH = candidate
      return
    except OSError as err:
      last_err = err

  raise RuntimeError(f"no writable database path for '{DB_PATH}': {last_err}")


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
  seed_tag = secrets.token_hex(4)
  rows = []
  for idx, item in enumerate(DEMO_SUBSCRIPTIONS, start=1):
    name, category, price, currency, cycle = item
    rows.append(
      (
        f"{user_id}_demo_{seed_tag}_{idx}",
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
  prepare_db_path()
  DB_PATH.parent.mkdir(parents=True, exist_ok=True)
  with db_conn() as conn:
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        is_super_admin INTEGER NOT NULL DEFAULT 0,
        is_disabled INTEGER NOT NULL DEFAULT 0,
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
        deleted_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
      """
    )
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS share_links (
        token TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
      )
      """
    )
    conn.execute(
      """
      CREATE TABLE IF NOT EXISTS icon_cache (
        cache_key TEXT PRIMARY KEY,
        icon_url TEXT NOT NULL,
        provider TEXT NOT NULL,
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
    if "deleted_at" not in columns:
      conn.execute("ALTER TABLE subscriptions ADD COLUMN deleted_at TEXT DEFAULT NULL")

    user_columns = {r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "is_super_admin" not in user_columns:
      conn.execute("ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0")
    if "is_disabled" not in user_columns:
      conn.execute("ALTER TABLE users ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0")

    row = conn.execute("SELECT id FROM users WHERE username = ?", (SUPER_ADMIN_USERNAME,)).fetchone()
    if not row:
      user_id = secrets.token_hex(8)
      salt_hex, pass_hex = create_password_hash(SUPER_ADMIN_PASSWORD)
      created = now_iso()
      conn.execute(
        "INSERT INTO users (id, username, is_super_admin, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, SUPER_ADMIN_USERNAME, 1, salt_hex, pass_hex, created),
      )
    else:
      user_id = row["id"]

    conn.execute("UPDATE users SET is_super_admin = 0 WHERE username <> ?", (SUPER_ADMIN_USERNAME,))
    conn.execute("UPDATE users SET is_super_admin = 1 WHERE username = ?", (SUPER_ADMIN_USERNAME,))
    conn.execute("UPDATE users SET is_disabled = 0 WHERE username = ?", (SUPER_ADMIN_USERNAME,))

    sub_count = conn.execute(
      "SELECT COUNT(1) AS c FROM subscriptions WHERE user_id = ? AND deleted_at IS NULL",
      (user_id,),
    ).fetchone()["c"]
    if int(sub_count or 0) == 0:
      seed_demo_subscriptions_for_user(conn, user_id)

    conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (now_iso(),))


def normalize_currency(value):
  code = (value or "CNY").strip().upper()
  if not code or len(code) < 3 or len(code) > 10:
    return None
  if not all(ch.isalnum() for ch in code):
    return None
  return code


def normalize_service_text(value):
  text = (value or "").strip().lower()
  text = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", " ", text)
  text = re.sub(r"\s+", " ", text).strip()
  return text


def slugify_service_name(value):
  text = (value or "").strip().lower()
  text = re.sub(r"[^a-z0-9]+", "", text)
  return text


def icon_cache_get(cache_key):
  now = now_dt()
  with db_conn() as conn:
    row = conn.execute(
      "SELECT icon_url, provider, updated_at FROM icon_cache WHERE cache_key = ?",
      (cache_key,),
    ).fetchone()
  if not row:
    return None
  try:
    updated = parse_iso(row["updated_at"])
  except Exception:
    return None
  if (now - updated).total_seconds() > ICON_CACHE_TTL_SECONDS:
    return None
  return {
    "iconUrl": row["icon_url"],
    "provider": row["provider"],
    "cached": True,
  }


def icon_cache_set(cache_key, icon_url, provider):
  ts = now_iso()
  with db_conn() as conn:
    conn.execute(
      """
      INSERT INTO icon_cache (cache_key, icon_url, provider, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        icon_url = excluded.icon_url,
        provider = excluded.provider,
        updated_at = excluded.updated_at
      """,
      (cache_key, icon_url, provider, ts),
    )


def check_icon_url(url):
  req = Request(
    url,
    headers={
      "User-Agent": "Subly/1.0 (+https://localhost)",
      "Accept": "image/*,*/*;q=0.8",
    },
  )
  with urlopen(req, timeout=4) as resp:
    ctype = (resp.headers.get("Content-Type") or "").lower()
    if "image" in ctype or "svg" in ctype or "icon" in ctype:
      return True
    # Some favicon endpoints omit content-type. Probe body as fallback.
    body = resp.read(64)
    return bool(body)


def build_icon_candidates(name, category=""):
  n = normalize_service_text(name)
  c = normalize_service_text(category)
  candidates = []
  seen = set()

  def add(url, provider):
    key = f"{provider}|{url}"
    if not url or key in seen:
      return
    seen.add(key)
    candidates.append((url, provider))

  for item in SERVICE_ICON_HINTS:
    if item["keyword"] in n:
      add(item.get("icon", ""), "hint-simpleicons")
      domain = item.get("domain", "")
      if domain:
        add(f"https://www.google.com/s2/favicons?sz=128&domain={quote(domain)}", "google-favicon")
        add(f"https://icons.duckduckgo.com/ip3/{quote(domain)}.ico", "duckduckgo-favicon")

  for alias_key, alias_values in SERVICE_NAME_ALIASES.items():
    if alias_key in (name or "") or alias_key.lower() in n:
      for alias in alias_values:
        add(f"https://cdn.simpleicons.org/{quote(alias)}", "alias-simpleicons")
        add(f"https://cdn.jsdelivr.net/npm/simple-icons/icons/{quote(alias)}.svg", "alias-simpleicons-jsdelivr")
        for tld in ("com", "cn", "io", "ai", "app"):
          domain = f"{alias}.{tld}"
          add(f"https://www.google.com/s2/favicons?sz=128&domain={quote(domain)}", "alias-google-favicon")
          add(f"https://icons.duckduckgo.com/ip3/{quote(domain)}.ico", "alias-ddg-favicon")

  slug = slugify_service_name(name)
  if slug:
    slug_variants = [slug]
    compact = re.sub(r"(plus|premium|pro|official|app)$", "", slug)
    if compact and compact != slug:
      slug_variants.append(compact)
    first_word = re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip().split(" ")[0]
    if first_word:
      slug_variants.append(first_word)

    for s in slug_variants[:4]:
      add(f"https://cdn.simpleicons.org/{quote(s)}", "simpleicons-cdn")
      add(f"https://cdn.jsdelivr.net/npm/simple-icons/icons/{quote(s)}.svg", "simpleicons-jsdelivr")
      for tld in ("com", "io", "ai", "app", "co", "dev"):
        domain = f"{s}.{tld}"
        add(f"https://www.google.com/s2/favicons?sz=128&domain={quote(domain)}", "google-favicon")
        add(f"https://icons.duckduckgo.com/ip3/{quote(domain)}.ico", "duckduckgo-favicon")

  if "云" in c or "cloud" in c:
    add("https://cdn.simpleicons.org/vercel/000000", "category-hint")
  if "娱乐" in c or "video" in c or "music" in c:
    add("https://cdn.simpleicons.org/plex/EBAF00", "category-hint")
  return candidates[:24]


def fetch_itunes_icon(name):
  term = (name or "").strip()
  if not term:
    return ""
  search_urls = [
    f"https://itunes.apple.com/search?term={quote(term)}&country=cn&entity=software&limit=8",
    f"https://itunes.apple.com/search?term={quote(term)}&country=us&entity=software&limit=8",
  ]

  normalized_term = normalize_service_text(term).replace(" ", "")
  for url in search_urls:
    try:
      req = Request(url, headers={"User-Agent": "Subly/1.0 (+https://localhost)"})
      with urlopen(req, timeout=6) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
      continue

    results = payload.get("results", [])
    if not isinstance(results, list):
      continue

    best_url = ""
    best_score = -1
    for item in results:
      if not isinstance(item, dict):
        continue
      artwork = str(item.get("artworkUrl512") or item.get("artworkUrl100") or "").strip()
      if not artwork.startswith("http"):
        continue
      track_name = str(item.get("trackName") or "").strip()
      bundle = str(item.get("bundleId") or "").strip().lower()
      n_track = normalize_service_text(track_name).replace(" ", "")

      score = 0
      if n_track and normalized_term and (normalized_term in n_track or n_track in normalized_term):
        score += 4
      if normalized_term and normalized_term in bundle:
        score += 3
      if str(item.get("primaryGenreName") or "").lower() in {"music", "entertainment", "productivity"}:
        score += 1
      if item.get("sellerName"):
        score += 1

      if score > best_score:
        best_score = score
        best_url = artwork

    if best_url:
      return best_url
  return ""


def resolve_icon_url(name, category=""):
  cache_key = f"{normalize_service_text(name)}|{normalize_service_text(category)}"
  if not cache_key or cache_key == "|":
    return {"iconUrl": "", "provider": "none", "cached": False}

  cached = icon_cache_get(cache_key)
  if cached:
    return cached

  # Priority source: App Store search usually has better coverage for Chinese app names.
  try:
    itunes_icon = fetch_itunes_icon(name)
    if itunes_icon:
      icon_cache_set(cache_key, itunes_icon, "itunes-search")
      return {"iconUrl": itunes_icon, "provider": "itunes-search", "cached": False}
  except Exception:
    pass

  for url, provider in build_icon_candidates(name, category):
    try:
      if check_icon_url(url):
        icon_cache_set(cache_key, url, provider)
        return {"iconUrl": url, "provider": provider, "cached": False}
    except Exception:
      continue

  return {"iconUrl": "", "provider": "none", "cached": False}


def store_uploaded_icon(file_name, mime_type, data_url):
  mime = (mime_type or "").strip().lower()
  if mime == "image/jpg":
    mime = "image/jpeg"
  if not mime:
    m = re.match(r"^data:([^;]+);base64,", data_url or "", re.IGNORECASE)
    if m:
      mime = m.group(1).strip().lower()
  if mime == "image/jpg":
    mime = "image/jpeg"
  if not mime:
    ext = Path(file_name or "").suffix.lower()
    ext_to_mime = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    }
    mime = ext_to_mime.get(ext, "")
  if mime not in ALLOWED_UPLOAD_MIME:
    raise ValueError("仅支持 PNG/JPG/WEBP/SVG")
  if not data_url.startswith("data:") or ";base64," not in data_url:
    raise ValueError("无效的图片数据")
  b64 = data_url.split(";base64,", 1)[1]
  try:
    raw = base64.b64decode(b64, validate=True)
  except Exception as err:
    raise ValueError("图片编码错误") from err
  if not raw or len(raw) > MAX_ICON_UPLOAD_BYTES:
    raise ValueError("图片为空或超过 1MB 限制")

  ext = ALLOWED_UPLOAD_MIME[mime]
  safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", (file_name or "icon").strip())[:32] or "icon"
  upload_name = f"{safe}-{secrets.token_hex(6)}{ext}"
  UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
  path = (UPLOAD_DIR / upload_name).resolve()
  try:
    path.relative_to(BASE_DIR.resolve())
  except ValueError as err:
    raise ValueError("非法上传路径") from err
  path.write_bytes(raw)
  return f"/assets/uploads/{upload_name}"


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


def row_to_share_json(row):
  return {
    "id": row["id"],
    "name": row["name"],
    "iconUrl": row["icon_url"] or "",
    "price": row["price"],
    "currency": row["currency"],
    "cycle": row["cycle"],
  }


def fetch_secondary_usd_rates(codes):
  if not codes:
    return {}
  symbol_query = ",".join(sorted(set(codes)))
  url = f"https://api.frankfurter.app/latest?from=USD&to={symbol_query}"
  payload = None
  try:
    req = Request(url, headers={"User-Agent": "Subly/1.0 (+https://localhost)"})
    with urlopen(req, timeout=6) as resp:
      payload = json.loads(resp.read().decode("utf-8"))
  except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
    try:
      raw = subprocess.check_output(["curl", "-s", url], timeout=8)
      payload = json.loads(raw.decode("utf-8"))
    except (subprocess.SubprocessError, FileNotFoundError, json.JSONDecodeError, ValueError) as err:
      raise URLError(str(err)) from err

  rates = payload.get("rates", {})
  result = {}
  for code in codes:
    if code in rates and rates[code] is not None:
      result[code] = float(rates[code])
  return result


def fetch_open_er_rates():
  url = "https://open.er-api.com/v6/latest/USD"
  payload = None
  try:
    with urlopen(url, timeout=6) as resp:
      payload = json.loads(resp.read().decode("utf-8"))
  except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
    try:
      raw = subprocess.check_output(["curl", "-s", url], timeout=8)
      payload = json.loads(raw.decode("utf-8"))
    except (subprocess.SubprocessError, FileNotFoundError, json.JSONDecodeError, ValueError) as err:
      raise URLError(str(err)) from err
  rates = payload.get("rates", {})
  if not isinstance(rates, dict):
    raise ValueError("invalid open-er-api payload")
  clean = {}
  for code, value in rates.items():
    c = str(code).strip().upper()
    if not c:
      continue
    try:
      clean[c] = float(value)
    except (TypeError, ValueError):
      continue
  clean["USD"] = 1.0
  return clean


def get_open_er_rates():
  now = time.time()
  if OPEN_ER_CACHE["loaded_at"] and (now - OPEN_ER_CACHE["loaded_at"] < FX_CACHE_TTL_SECONDS):
    return OPEN_ER_CACHE["rates"]
  rates = fetch_open_er_rates()
  OPEN_ER_CACHE["loaded_at"] = now
  OPEN_ER_CACHE["rates"] = rates
  return rates


def fetch_currency_names():
  url = "https://openexchangerates.org/api/currencies.json"
  payload = None
  try:
    with urlopen(url, timeout=6) as resp:
      payload = json.loads(resp.read().decode("utf-8"))
  except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
    try:
      raw = subprocess.check_output(["curl", "-s", url], timeout=8)
      payload = json.loads(raw.decode("utf-8"))
    except (subprocess.SubprocessError, FileNotFoundError, json.JSONDecodeError, ValueError) as err:
      raise URLError(str(err)) from err
  if not isinstance(payload, dict):
    raise ValueError("invalid currency names payload")
  result = {}
  for code, name in payload.items():
    c = str(code or "").strip().upper()
    n = str(name or "").strip()
    if not c or not n:
      continue
    result[c] = n
  return result


def get_currency_names():
  now = time.time()
  if CURRENCY_NAME_CACHE["loaded_at"] and (now - CURRENCY_NAME_CACHE["loaded_at"] < 24 * 60 * 60):
    return CURRENCY_NAME_CACHE["names"]
  names = fetch_currency_names()
  CURRENCY_NAME_CACHE["loaded_at"] = now
  CURRENCY_NAME_CACHE["names"] = names
  return names


def fetch_live_usd_rates():
  payload_rates = get_open_er_rates()
  frankfurter_payload_rates = {}
  try:
    symbols = sorted([c for c in CURRENCY_CODES if c != "USD"])
    symbol_query = ",".join(symbols)
    url = f"https://api.frankfurter.app/latest?from=USD&to={symbol_query}"
    req = Request(url, headers={"User-Agent": "Subly/1.0 (+https://localhost)"})
    with urlopen(req, timeout=6) as resp:
      payload = json.loads(resp.read().decode("utf-8"))
      frankfurter_payload_rates = payload.get("rates", {}) if isinstance(payload, dict) else {}
  except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
    frankfurter_payload_rates = {}
  rates = {"USD": 1.0}
  missing_codes = []
  for code in CURRENCY_CODES:
    if code == "USD":
      continue
    val = payload_rates.get(code)
    if val is None:
      val = frankfurter_payload_rates.get(code)
    if val is None:
      missing_codes.append(code)
      rates[code] = float(FALLBACK_USD_RATES[code])
      continue
    rates[code] = float(val)

  if missing_codes:
    secondary = {}
    try:
      secondary = fetch_secondary_usd_rates(missing_codes)
    except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
      secondary = {}
    if secondary:
      unresolved = []
      for code in missing_codes:
        if code in secondary:
          rates[code] = float(secondary[code])
        else:
          unresolved.append(code)
      missing_codes = unresolved

  if not missing_codes and any(code not in payload_rates for code in CURRENCY_CODES if code != "USD"):
    source = "open-er-api+frankfurter"
  elif missing_codes:
    source = "open-er-api_partial"
  else:
    source = "open-er-api"

  return {
    "updated_at": datetime.now(UTC).date().isoformat(),
    "source": source,
    "rates": rates,
    "missing_codes": missing_codes,
  }


def get_usd_rates():
  now = time.time()
  cache_age = now - FX_CACHE["loaded_at"]
  if FX_CACHE["loaded_at"] and str(FX_CACHE["source"]) != "fallback" and cache_age < FX_CACHE_TTL_SECONDS:
    return {
      "base": "USD",
      "rates": FX_CACHE["rates"],
      "updatedAt": FX_CACHE["updated_at"],
      "source": FX_CACHE["source"],
      "stale": bool(FX_CACHE.get("missing_codes")),
      "missingCodes": FX_CACHE.get("missing_codes", []),
    }

  try:
    fresh = fetch_live_usd_rates()
    FX_CACHE["loaded_at"] = now
    FX_CACHE["updated_at"] = fresh["updated_at"]
    FX_CACHE["source"] = fresh["source"]
    FX_CACHE["rates"] = fresh["rates"]
    FX_CACHE["missing_codes"] = fresh.get("missing_codes", [])
    return {
      "base": "USD",
      "rates": FX_CACHE["rates"],
      "updatedAt": FX_CACHE["updated_at"],
      "source": FX_CACHE["source"],
      "stale": bool(FX_CACHE.get("missing_codes")),
      "missingCodes": FX_CACHE.get("missing_codes", []),
    }
  except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
    has_cache = FX_CACHE["loaded_at"] > 0
    if not has_cache:
      FX_CACHE["loaded_at"] = now
      FX_CACHE["updated_at"] = datetime.now(UTC).date().isoformat()
      FX_CACHE["source"] = "fallback"
      FX_CACHE["rates"] = FALLBACK_USD_RATES.copy()
      FX_CACHE["missing_codes"] = sorted(CURRENCY_CODES)
    return {
      "base": "USD",
      "rates": FX_CACHE["rates"],
      "updatedAt": FX_CACHE["updated_at"],
      "source": FX_CACHE["source"],
      "stale": True,
      "missingCodes": FX_CACHE.get("missing_codes", []),
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

  def _send_no_content(self):
    self.send_response(204)
    self.send_header("Content-Length", "0")
    self.end_headers()

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
        SELECT u.id, u.username, u.is_super_admin, u.is_disabled, s.expires_at
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
      if bool(row["is_disabled"]):
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return None
      return {
        "id": row["id"],
        "username": row["username"],
        "isSuperAdmin": bool(row["is_super_admin"]),
        "isDisabled": bool(row["is_disabled"]),
        "token": token,
      }

  def _require_auth(self):
    user = self._auth_user()
    if not user:
      self._send_json(401, {"error": "Unauthorized"})
      return None
    return user

  def _require_super_admin(self):
    user = self._require_auth()
    if not user:
      return None
    if not user.get("isSuperAdmin"):
      self._send_json(403, {"error": "Super admin only"})
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
    if username.lower() == SUPER_ADMIN_USERNAME.lower():
      self._send_json(403, {"error": "Super admin username is reserved"})
      return

    user_id = secrets.token_hex(8)
    salt_hex, pass_hex = create_password_hash(password)
    created = now_iso()
    token = secrets.token_urlsafe(32)
    expires = (now_dt() + timedelta(days=SESSION_EXPIRE_DAYS)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    try:
      with db_conn() as conn:
        conn.execute(
          "INSERT INTO users (id, username, is_super_admin, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          (user_id, username, 0, salt_hex, pass_hex, created),
        )
        conn.execute(
          "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
          (token, user_id, created, expires),
        )
        seed_demo_subscriptions_for_user(conn, user_id)
    except sqlite3.IntegrityError:
      self._send_json(409, {"error": "Username already exists"})
      return

    self._send_json(201, {"token": token, "user": {"id": user_id, "username": username, "isSuperAdmin": False}})

  def _handle_auth_login(self, payload):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    with db_conn() as conn:
      user = conn.execute(
        "SELECT id, username, is_super_admin, is_disabled, password_salt, password_hash FROM users WHERE username = ?",
        (username,),
      ).fetchone()
      if not user:
        self._send_json(401, {"error": "Invalid credentials"})
        return
      if bool(user["is_disabled"]):
        self._send_json(403, {"error": "Account disabled"})
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
    self._send_json(
      200,
      {
        "token": token,
        "user": {"id": user["id"], "username": user["username"], "isSuperAdmin": bool(user["is_super_admin"])},
      },
    )

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

    # Browser/DevTools probing endpoints; silence noisy 404s in local console.
    if path in {"/.well-known/appspecific/com.chrome.devtools.json"}:
      self._send_no_content()
      return

    if path == "/api/auth/me":
      user = self._require_auth()
      if not user:
        return
      self._send_json(
        200,
        {"user": {"id": user["id"], "username": user["username"], "isSuperAdmin": bool(user.get("isSuperAdmin"))}},
      )
      return

    if path == "/api/admin/users":
      user = self._require_super_admin()
      if not user:
        return
      with db_conn() as conn:
        rows = conn.execute(
          """
          SELECT
            u.id,
            u.username,
            u.is_super_admin,
            u.is_disabled,
            u.created_at,
            (
              SELECT COUNT(1) FROM subscriptions s
              WHERE s.user_id = u.id AND s.deleted_at IS NULL
            ) AS subscription_count
          FROM users u
          ORDER BY u.created_at DESC
          """
        ).fetchall()
      self._send_json(
        200,
        [
          {
            "id": r["id"],
            "username": r["username"],
            "isSuperAdmin": bool(r["is_super_admin"]),
            "isDisabled": bool(r["is_disabled"]),
            "createdAt": r["created_at"],
            "subscriptionCount": int(r["subscription_count"] or 0),
          }
          for r in rows
        ],
      )
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
          WHERE user_id = ? AND deleted_at IS NULL
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

    if path == "/api/currencies":
      try:
        rates = get_open_er_rates()
        codes = sorted(rates.keys())
      except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
        codes = sorted(CURRENCY_CODES)
      try:
        names = get_currency_names()
      except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
        names = {}
      items = [{"code": code, "name": names.get(code, code)} for code in codes]
      self._send_json(200, {"codes": codes, "items": items})
      return

    if path == "/api/currency-rate":
      code = (query.get("code", [""])[0] or "").strip().upper()
      if not code:
        self._send_json(400, {"error": "Missing code"})
        return
      if not code.isalnum() or len(code) < 3 or len(code) > 10:
        self._send_json(400, {"error": "Invalid code"})
        return
      try:
        rates = get_open_er_rates()
      except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
        rates = {}
      if code in rates:
        self._send_json(200, {"code": code, "usdRate": float(rates[code]), "source": "open-er-api"})
        return
      fallback = FALLBACK_USD_RATES.get(code)
      if fallback is not None:
        self._send_json(200, {"code": code, "usdRate": float(fallback), "source": "fallback"})
        return
      self._send_json(404, {"error": "Rate not found"})
      return

    if path.startswith("/api/share/"):
      parts = path.split("/")
      if len(parts) != 4 or not parts[3]:
        self.send_error(404, "Not Found")
        return
      token = parts[3]
      with db_conn() as conn:
        owner = conn.execute(
          """
          SELECT u.id, u.username
          FROM share_links sl
          JOIN users u ON u.id = sl.user_id
          WHERE sl.token = ?
          """,
          (token,),
        ).fetchone()
        if not owner:
          self._send_json(404, {"error": "Share link not found"})
          return
        rows = conn.execute(
          """
          SELECT id, name, category, price, currency, icon_url, cycle, next_payment_date, status, note, created_at, updated_at, tags
          FROM subscriptions
          WHERE user_id = ? AND deleted_at IS NULL
          ORDER BY next_payment_date ASC
          """,
          (owner["id"],),
        ).fetchall()
      self._send_json(
        200,
        {
          "owner": {"username": owner["username"]},
          "subscriptions": [row_to_share_json(r) for r in rows],
          "sharedAt": now_iso(),
        },
      )
      return

    static_map = {
      "/": ("index.html", "text/html; charset=utf-8"),
      "/index.html": ("index.html", "text/html; charset=utf-8"),
      "/favicon.ico": ("assets/subly-logo.svg", "image/svg+xml"),
      "/favicon.svg": ("assets/subly-logo.svg", "image/svg+xml"),
      "/app.js": ("app.js", "application/javascript; charset=utf-8"),
      "/styles.css": ("styles.css", "text/css; charset=utf-8"),
      "/share.html": ("share.html", "text/html; charset=utf-8"),
      "/share.js": ("share.js", "application/javascript; charset=utf-8"),
    }
    if path in static_map:
      rel, ctype = static_map[path]
      self._send_text_file(BASE_DIR / rel, ctype)
      return

    if path.startswith("/share/"):
      self._send_text_file(BASE_DIR / "share.html", "text/html; charset=utf-8")
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

    if parsed.path == "/api/icons/resolve":
      user = self._require_auth()
      if not user:
        return
      payload = self._read_json_body()
      if payload is None:
        self._send_json(400, {"error": "Invalid JSON"})
        return
      name = str(payload.get("name") or "").strip()
      category = str(payload.get("category") or "").strip()
      if not name:
        self._send_json(400, {"error": "Missing name"})
        return
      self._send_json(200, resolve_icon_url(name, category))
      return

    if parsed.path == "/api/icons/upload":
      user = self._require_auth()
      if not user:
        return
      payload = self._read_json_body()
      if payload is None:
        self._send_json(400, {"error": "Invalid JSON"})
        return
      file_name = str(payload.get("fileName") or "").strip()
      mime_type = str(payload.get("mimeType") or "").strip()
      data_url = str(payload.get("dataUrl") or "").strip()
      try:
        icon_path = store_uploaded_icon(file_name, mime_type, data_url)
      except ValueError as err:
        self._send_json(400, {"error": str(err)})
        return
      self._send_json(201, {"iconUrl": icon_path})
      return

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

    if parsed.path == "/api/share-links":
      user = self._require_auth()
      if not user:
        return
      token = secrets.token_urlsafe(18)
      created = now_iso()
      with db_conn() as conn:
        conn.execute(
          """
          INSERT INTO share_links (token, user_id, created_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            token = excluded.token,
            created_at = excluded.created_at
          """,
          (token, user["id"], created),
        )
      self._send_json(201, {"token": token, "urlPath": f"/share/{token}"})
      return

    if parsed.path == "/api/admin/users/status":
      user = self._require_super_admin()
      if not user:
        return
      payload = self._read_json_body()
      if payload is None:
        self._send_json(400, {"error": "Invalid JSON"})
        return
      target_user_id = str(payload.get("userId") or "").strip()
      raw_disabled = payload.get("disabled")
      if not isinstance(raw_disabled, bool):
        self._send_json(400, {"error": "disabled must be boolean"})
        return
      disabled = raw_disabled
      if not target_user_id:
        self._send_json(400, {"error": "Missing userId"})
        return
      if target_user_id == user["id"]:
        self._send_json(400, {"error": "Cannot change your own status"})
        return
      with db_conn() as conn:
        target = conn.execute(
          "SELECT id, username, is_super_admin FROM users WHERE id = ?",
          (target_user_id,),
        ).fetchone()
        if not target:
          self._send_json(404, {"error": "User not found"})
          return
        if bool(target["is_super_admin"]):
          self._send_json(400, {"error": "Cannot change super admin"})
          return
        conn.execute(
          "UPDATE users SET is_disabled = ? WHERE id = ?",
          (1 if disabled else 0, target_user_id),
        )
        if disabled:
          conn.execute("DELETE FROM sessions WHERE user_id = ?", (target_user_id,))
      self._send_json(200, {"ok": True})
      return

    if parsed.path == "/api/subscriptions/reset":
      user = self._require_auth()
      if not user:
        return
      ts = now_iso()
      with db_conn() as conn:
        conn.execute(
          """
          UPDATE subscriptions
          SET deleted_at = ?, updated_at = ?
          WHERE user_id = ? AND deleted_at IS NULL
          """,
          (ts, ts, user["id"]),
        )
        seed_demo_subscriptions_for_user(conn, user["id"])
      self._send_json(200, {"ok": True})
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
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL
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
    ts = now_iso()
    with db_conn() as conn:
      cur = conn.execute(
        "UPDATE subscriptions SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        (ts, ts, sub_id, user["id"]),
      )
    if cur.rowcount == 0:
      self._send_json(404, {"error": "Not found"})
      return
    self._send_json(200, {"ok": True})


def main():
  init_db()
  host = os.environ.get("HOST", "127.0.0.1")
  port = int(os.environ.get("PORT", "5173"))
  server = ThreadingHTTPServer((host, port), Handler)
  print(f"Serving on http://{host}:{port}")
  server.serve_forever()


if __name__ == "__main__":
  main()
