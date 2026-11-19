import time
from collections import defaultdict
from fastapi import Request, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

class InMemoryRateLimiter:
    """
    Sliding window rate limiter per client IP address.
    Thread-safe and zero-dependency.
    """
    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self.requests = defaultdict(list)

    def check(self, request: Request, custom_rpm: int = None):
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown").split(",")[0].strip()
        now = time.time()
        window_start = now - 60.0
        limit = custom_rpm or self.rpm

        # Purge timestamps older than 60 seconds
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > window_start]

        if len(self.requests[client_ip]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: Max {limit} requests per minute. Please retry shortly."
            )

        self.requests[client_ip].append(now)

rate_limiter = InMemoryRateLimiter(requests_per_minute=60)
llm_rate_limiter = InMemoryRateLimiter(requests_per_minute=25)

async def verify_api_guard(api_key: str = Security(api_key_header)):
    """
    Protects private backend endpoints against unauthorized public access.
    If API_SECRET_KEY is defined in environment, requests must include valid X-API-Key header.
    """
    secret = getattr(settings, "API_SECRET_KEY", None)
    if secret:
        if not api_key or api_key != secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: Missing or invalid X-API-Key header."
            )
    return True
