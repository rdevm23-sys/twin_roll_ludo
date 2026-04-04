from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .routes import router
from .websocket import websocket_endpoint
from .auth_routes import router as auth_router
from .database import init_pool, create_tables

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_pool()
    create_tables()

app.include_router(router)
app.include_router(auth_router)
app.add_websocket_route("/ws", websocket_endpoint)

# ── Serve built SPA (nginx serves this in production) ─────────────────────
_dist = os.path.join(os.path.dirname(__file__), "..", "libre_ludo", "dist")
if os.path.exists(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")