# core/security.py
# Password hashing and JWT-style token utilities — stdlib only, no extra deps.

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional

from core.config import settings


# ── Password hashing ──────────────────────────────────────────────────────────
# Uses PBKDF2-HMAC-SHA256 with 260k iterations + 16-byte random salt.
# Comparable to bcrypt cost-12.

_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    """Return a salted hash string suitable for DB storage."""
    salt = secrets.token_hex(16)          # 32-char hex string
    h    = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), _ITERATIONS
    )
    return f"{salt}:{h.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    """Constant-time comparison of plain text against stored hash."""
    try:
        salt, h_hex = stored.split(":", 1)
    except ValueError:
        return False
    expected = hashlib.pbkdf2_hmac(
        "sha256", plain.encode(), salt.encode(), _ITERATIONS
    )
    return hmac.compare_digest(h_hex, expected.hex())


# ── Token creation / decoding ─────────────────────────────────────────────────
# Simple signed token: base64url(json_payload) + "." + HMAC-SHA256 signature.
# 7-day expiry by default.

TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7   # 7 days


def create_access_token(user_id: int) -> str:
    payload = {
        "sub": user_id,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
        "iat": int(time.time()),
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload).encode()
    ).decode()
    sig = hmac.new(
        settings.secret_key.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{sig}"


def decode_access_token(token: str) -> Optional[int]:
    """Return user_id if token is valid and unexpired, else None."""
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(
            settings.secret_key.encode(),
            payload_b64.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return int(payload["sub"])
    except Exception:
        return None
