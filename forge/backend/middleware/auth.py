from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from services.supabase_service import supabase_admin
    token = credentials.credentials
    try:
        response = supabase_admin.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    if not credentials:
        return None
    from services.supabase_service import supabase_admin
    try:
        response = supabase_admin.auth.get_user(credentials.credentials)
        return response.user
    except Exception:
        return None
