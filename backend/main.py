from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .routes import router
from .websocket import websocket_endpoint

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.add_websocket_route("/ws", websocket_endpoint)

# ── Serve frontend ──────────────────────────────────────────────────────────
# Try to serve built LibreLudo frontend first, then fall back to old frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "libre_ludo", "dist")
if os.path.exists(frontend_path):
    # This is primarily for development; nginx serves this in production
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    # Fallback to old frontend for backwards compatibility
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
    if os.path.exists(frontend_path):
        app.mount("/static", StaticFiles(directory=frontend_path), name="static")