from typing import Any, Optional
from fastapi import Header, HTTPException
from backend.config import settings


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    # Dev mode: no Supabase configured, or bypass explicitly enabled
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY or settings.DEV_BYPASS_AUTH:
        return {"id": None, "email": "dev@local"}

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        response = client.auth.get_user(token)
        return {"id": str(response.user.id), "email": response.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
