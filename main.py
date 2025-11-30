from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
from pathlib import Path

from routers import auth, modpacks, search, versions, upload
from middleware.ratelimit import limiter, rate_limit_exceeded_handler

app = FastAPI(
    title="ChunkHub API",
    description="Registry API for Chunk modpack server toolkit",
    version="0.1.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth.router)
app.include_router(modpacks.router)
app.include_router(search.router)
app.include_router(versions.router)
app.include_router(upload.router)

@app.get("/")
@limiter.limit("100/minute")
async def root(request: Request):
    return {
        "name": "ChunkHub API",
        "version": "0.1.0",
        "status": "online"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
