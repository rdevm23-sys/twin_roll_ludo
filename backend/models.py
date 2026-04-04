import json
from typing import Optional
from fastapi import WebSocket

from .config import COLORS

class Room:
    def __init__(self, code: str, host_id: str, host_name: str,
                 max_players: int, twin_dice: bool, is_public: bool):
        self.code = code
        self.max_players = max_players
        self.twin_dice = twin_dice
        self.is_public = is_public
        self.players: dict[str, dict] = {}
        self.game: Optional[dict] = None
        self.started = False
        self.host_id = host_id

    def assign_color(self):
        used = {p["color"] for p in self.players.values() if p.get("color")}
        for c in COLORS[:self.max_players]:
            if c not in used:
                return c
        return None

    def is_full(self):
        return len(self.players) >= self.max_players

    async def broadcast(self, msg: dict, exclude: str = None):
        data = json.dumps(msg)
        for pid, p in list(self.players.items()):
            if pid != exclude:
                try:
                    await p["ws"].send_text(data)
                except: pass

    def player_list(self):
        return [{"id": pid, "name": p["name"], "color": p.get("color"), "ready": p.get("ready", False)}
                for pid, p in self.players.items()]

    def full_state(self):
        return {
            "type": "room_state", "code": self.code, "players": self.player_list(),
            "max_players": self.max_players, "twin_dice": self.twin_dice,
            "started": self.started, "is_public": self.is_public, "host_id": self.host_id,
        }