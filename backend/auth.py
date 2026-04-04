import hashlib
import hmac
import secrets
import time
import json
import base64

SECRET_KEY = "twin-roll-jwt-secret-change-in-prod"

# ── Password hashing ──────────────────────────────────
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{h.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, h = hashed.split(":")
        new_h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return hmac.compare_digest(h, new_h.hex())
    except Exception:
        return False

# ── JWT ───────────────────────────────────────────────
def create_token(player_id: int, username: str) -> str:
    payload = {
        "player_id": player_id,
        "username": username,
        "exp": int(time.time()) + 86400 * 30,  # 30 days
    }
    data = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"{data}.{sig}"

def verify_token(token: str) -> dict | None:
    try:
        data, sig = token.rsplit(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(data).decode())
        if payload["exp"] < time.time():
            return None
        return payload
    except Exception:
        return None
