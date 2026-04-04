import asyncio
import json
import random
import string
import time
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Game Constants ───────────────────────────────────────────────────────────
COLORS = ["red", "green", "yellow", "blue"]
HOME_POSITIONS = {"red": [0,1,2,3], "green": [4,5,6,7], "yellow": [8,9,10,11], "blue": [12,13,14,15]}
START_SQUARES = {"red": 1, "green": 14, "yellow": 27, "blue": 40}  # on the 52-square track
SAFE_SQUARES = {1, 9, 14, 22, 27, 35, 40, 48}  # including start squares
HOME_COLUMN_ENTRY = {"red": 51, "green": 12, "yellow": 25, "blue": 38}
HOME_COLUMN_LENGTH = 6
TOTAL_TRACK = 52

# ─── State ────────────────────────────────────────────────────────────────────
rooms: dict[str, dict] = {}
matchmaking_queue: list[dict] = []  # [{ws, player_id, mode, player_count, name}]

def gen_code(n=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def init_game_state(player_colors: list[str], mode: str, twin_dice: bool) -> dict:
    pieces = {}
    for color in player_colors:
        for i in range(4):
            pieces[f"{color}_{i}"] = {
                "color": color,
                "index": i,
                "pos": -1,          # -1 = home base, 0-51 = track, 100-105 = home column
                "track_pos": -1,    # absolute track position (0-51)
                "finished": False,
            }
    return {
        "pieces": pieces,
        "players": player_colors,
        "current_turn": player_colors[0],
        "mode": mode,
        "twin_dice": twin_dice,
        "dice": [],          # list of roll results, e.g. [3] or [3,5] for twin
        "dice_rolled": False,
        "moves_used": [],    # track which dice values have been used
        "winner": None,
        "turn_start_time": time.time(),
        "consecutive_sixes": 0,
    }

def roll_dice(twin: bool) -> list[int]:
    if twin:
        return [random.randint(1,6), random.randint(1,6)]
    return [random.randint(1,6)]

def get_track_pos(color: str, steps_from_start: int) -> int:
    """Return absolute track position (0-51) given steps taken from start."""
    start = START_SQUARES[color] - 1  # 0-indexed
    return (start + steps_from_start) % TOTAL_TRACK

def can_enter_home_column(color: str, track_pos: int) -> bool:
    entry = HOME_COLUMN_ENTRY[color]
    return track_pos == entry

def compute_valid_moves(state: dict, dice_remaining: list[int]) -> list[dict]:
    """Return all valid moves for current player given remaining dice."""
    color = state["current_turn"]
    valid = []
    pieces_of_color = [p for p in state["pieces"].values() if p["color"] == color and not p["finished"]]

    for die_val in set(dice_remaining):  # deduplicate same die values
        for piece in pieces_of_color:
            move = try_move(state, piece, die_val, color)
            if move:
                valid.append({**move, "die_val": die_val})

    return valid

def try_move(state: dict, piece: dict, die_val: int, color: str) -> Optional[dict]:
    pid = f"{color}_{piece['index']}"

    # Piece in home base: needs 6 to enter
    if piece["pos"] == -1:
        if die_val == 6:
            return {"piece_id": pid, "from": -1, "to": "track", "track_to": START_SQUARES[color]-1, "captures": []}
        return None

    # Piece in home column (pos 100-105)
    if piece["pos"] >= 100:
        col_pos = piece["pos"] - 100
        new_col = col_pos + die_val
        if new_col == HOME_COLUMN_LENGTH:  # exactly finishes
            return {"piece_id": pid, "from": piece["pos"], "to": "finish", "captures": []}
        elif new_col < HOME_COLUMN_LENGTH:
            return {"piece_id": pid, "from": piece["pos"], "to": 100 + new_col, "captures": []}
        return None  # overshoot

    # Piece on track
    track_pos = piece["track_pos"]
    entry = HOME_COLUMN_ENTRY[color]

    # Calculate steps to entry point
    start_idx = START_SQUARES[color] - 1
    steps_traveled = (track_pos - start_idx) % TOTAL_TRACK
    steps_to_entry = (entry - start_idx) % TOTAL_TRACK

    if steps_traveled + die_val > steps_to_entry + HOME_COLUMN_LENGTH:
        return None  # overshoot home column

    if steps_traveled + die_val > steps_to_entry:
        # Enter home column
        col_pos = (steps_traveled + die_val) - steps_to_entry - 1
        if col_pos == HOME_COLUMN_LENGTH - 1:
            return {"piece_id": pid, "from": piece["pos"], "to": "finish", "captures": []}
        return {"piece_id": pid, "from": piece["pos"], "to": 100 + col_pos, "captures": []}

    new_track = (track_pos + die_val) % TOTAL_TRACK
    # Check captures
    captures = []
    if new_track not in SAFE_SQUARES:
        for other in state["pieces"].values():
            if other["color"] != color and not other["finished"] and other["pos"] != -1 and other["pos"] < 100:
                if other["track_pos"] == new_track:
                    captures.append(f"{other['color']}_{other['index']}")

    return {"piece_id": pid, "from": piece["pos"], "to": new_track, "captures": captures, "is_track": True}

def apply_move(state: dict, piece_id: str, die_val: int) -> dict:
    """Apply a move, return updated state + event info."""
    color = state["current_turn"]
    piece = state["pieces"][piece_id]
    move = try_move(state, piece, die_val, color)
    if not move:
        return {"ok": False, "error": "Invalid move"}

    events = []

    if move["to"] == "finish":
        piece["finished"] = True
        piece["pos"] = 200
        events.append({"type": "finished", "piece_id": piece_id})
    elif move["to"] == "track":
        piece["pos"] = move["track_to"]
        piece["track_pos"] = move["track_to"]
        events.append({"type": "moved", "piece_id": piece_id, "to": move["track_to"]})
    elif isinstance(move["to"], int) and move["to"] >= 100:
        piece["pos"] = move["to"]
        events.append({"type": "moved", "piece_id": piece_id, "to": move["to"]})
    else:
        piece["pos"] = move["to"]
        piece["track_pos"] = move["to"]
        events.append({"type": "moved", "piece_id": piece_id, "to": move["to"]})

    # Handle captures
    for cap_id in move.get("captures", []):
        cap = state["pieces"][cap_id]
        cap["pos"] = -1
        cap["track_pos"] = -1
        events.append({"type": "captured", "piece_id": cap_id})

    # Remove used die
    if die_val in state["moves_used"]:
        state["moves_used"].remove(die_val)  # only remove once

    # Check win
    if all(p["finished"] for p in state["pieces"].values() if p["color"] == color):
        state["winner"] = color
        events.append({"type": "winner", "color": color})

    return {"ok": True, "events": events}

def next_turn(state: dict, got_six: bool) -> bool:
    """Advance turn. Returns True if same player goes again (got a 6, <3 consecutive)."""
    if got_six:
        state["consecutive_sixes"] += 1
        if state["consecutive_sixes"] < 3:
            # Reset dice for another roll, same player
            state["dice"] = []
            state["dice_rolled"] = False
            state["moves_used"] = []
            return True
        # 3 consecutive sixes = forfeit turn, fall through to advance
    state["consecutive_sixes"] = 0
    players = state["players"]
    idx = players.index(state["current_turn"])
    state["current_turn"] = players[(idx + 1) % len(players)]
    state["dice"] = []
    state["dice_rolled"] = False
    state["moves_used"] = []
    return False

# ─── Room Management ─────────────────────────────────────────────────────────
class Room:
    def __init__(self, code: str, host_id: str, host_name: str,
                 max_players: int, twin_dice: bool, is_public: bool):
        self.code = code
        self.max_players = max_players
        self.twin_dice = twin_dice
        self.is_public = is_public
        self.players: dict[str, dict] = {}  # player_id -> {ws, name, color, ready}
        self.spectators: dict[str, WebSocket] = {}
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
                except:
                    pass

    async def send(self, player_id: str, msg: dict):
        p = self.players.get(player_id)
        if p:
            try:
                await p["ws"].send_text(json.dumps(msg))
            except:
                pass

    def player_list(self):
        return [{"id": pid, "name": p["name"], "color": p["color"], "ready": p.get("ready", False)}
                for pid, p in self.players.items()]

    def full_state(self):
        return {
            "type": "room_state",
            "code": self.code,
            "players": self.player_list(),
            "max_players": self.max_players,
            "twin_dice": self.twin_dice,
            "started": self.started,
            "is_public": self.is_public,
            "host_id": self.host_id,
        }

# ─── WebSocket Handler ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    player_id = gen_code(8)
    current_room: Optional[Room] = None

    async def send(msg):
        await ws.send_text(json.dumps(msg))

    try:
        await send({"type": "connected", "player_id": player_id})

        async for raw in ws.iter_text():
            try:
                msg = json.loads(raw)
            except:
                continue
            action = msg.get("action")

            # ── CREATE ROOM ──
            if action == "create_room":
                code = gen_code(6)
                while code in rooms:
                    code = gen_code(6)
                room = Room(
                    code=code,
                    host_id=player_id,
                    host_name=msg.get("name", "Player"),
                    max_players=msg.get("max_players", 4),
                    twin_dice=msg.get("twin_dice", False),
                    is_public=msg.get("is_public", False),
                )
                rooms[code] = room
                color = room.assign_color()
                room.players[player_id] = {"ws": ws, "name": msg.get("name","Player"), "color": color, "ready": False}
                current_room = room
                await send({**room.full_state(), "your_color": color, "your_id": player_id})

            # ── JOIN ROOM ──
            elif action == "join_room":
                code = msg.get("code", "").upper()
                room = rooms.get(code)
                if not room:
                    await send({"type": "error", "msg": "Room not found"})
                elif room.started:
                    await send({"type": "error", "msg": "Game already started"})
                elif room.is_full():
                    await send({"type": "error", "msg": "Room is full"})
                else:
                    color = room.assign_color()
                    room.players[player_id] = {"ws": ws, "name": msg.get("name","Player"), "color": color, "ready": False}
                    current_room = room
                    await send({**room.full_state(), "your_color": color, "your_id": player_id})
                    await room.broadcast({"type": "player_joined", "players": room.player_list(), "name": msg.get("name","Player")}, exclude=player_id)

            # ── MATCHMAKING ──
            elif action == "find_match":
                desired_players = msg.get("max_players", 4)
                twin_dice = msg.get("twin_dice", False)
                name = msg.get("name", "Player")

                # Check existing public rooms
                matched_room = None
                for r in rooms.values():
                    if r.is_public and not r.started and not r.is_full() and r.max_players == desired_players and r.twin_dice == twin_dice:
                        matched_room = r
                        break

                if matched_room:
                    color = matched_room.assign_color()
                    matched_room.players[player_id] = {"ws": ws, "name": name, "color": color, "ready": False}
                    current_room = matched_room
                    await send({**matched_room.full_state(), "your_color": color, "your_id": player_id})
                    await matched_room.broadcast({"type": "player_joined", "players": matched_room.player_list(), "name": name}, exclude=player_id)
                else:
                    # Create a public room
                    code = gen_code(6)
                    while code in rooms:
                        code = gen_code(6)
                    room = Room(code=code, host_id=player_id, host_name=name,
                                max_players=desired_players, twin_dice=twin_dice, is_public=True)
                    rooms[code] = room
                    color = room.assign_color()
                    room.players[player_id] = {"ws": ws, "name": name, "color": color, "ready": False}
                    current_room = room
                    await send({**room.full_state(), "your_color": color, "your_id": player_id, "type": "waiting_for_players"})

            # ── TOGGLE READY ──
            elif action == "toggle_ready":
                if current_room and player_id in current_room.players:
                    p = current_room.players[player_id]
                    p["ready"] = not p.get("ready", False)
                    await current_room.broadcast({"type": "player_ready", "players": current_room.player_list()})

                    # Auto-start if everyone ready and min 2 players
                    all_ready = all(pp.get("ready") for pp in current_room.players.values())
                    if all_ready and len(current_room.players) >= 2:
                        colors = [current_room.players[pid]["color"] for pid in current_room.players]
                        current_room.game = init_game_state(colors, "multiplayer", current_room.twin_dice)
                        current_room.started = True
                        await current_room.broadcast({
                            "type": "game_start",
                            "game": current_room.game,
                            "players": current_room.player_list(),
                        })

            # ── ROLL DICE ──
            elif action == "roll_dice":
                room = current_room
                if not room or not room.started:
                    continue
                game = room.game
                if game["winner"] or game["dice_rolled"]:
                    continue
                p = room.players.get(player_id)
                if not p or p["color"] != game["current_turn"]:
                    await send({"type": "error", "msg": "Not your turn"})
                    continue

                rolls = roll_dice(game["twin_dice"])
                game["dice"] = rolls
                game["dice_rolled"] = True
                game["moves_used"] = list(rolls)  # copy of available dice

                valid_moves = compute_valid_moves(game, game["moves_used"])

                # No valid moves → auto advance
                if not valid_moves:
                    has_six = 6 in rolls
                    extra_turn = next_turn(game, has_six)
                    await room.broadcast({
                        "type": "dice_rolled",
                        "player_id": player_id,
                        "rolls": rolls,
                        "valid_moves": [],
                        "auto_pass": True,
                        "extra_turn": extra_turn,
                        "game": game,
                    })
                else:
                    await room.broadcast({
                        "type": "dice_rolled",
                        "player_id": player_id,
                        "rolls": rolls,
                        "valid_moves": valid_moves,
                        "game": game,
                    })

            # ── MOVE PIECE ──
            elif action == "move_piece":
                room = current_room
                if not room or not room.started:
                    continue
                game = room.game
                if game["winner"]:
                    continue
                p = room.players.get(player_id)
                if not p or p["color"] != game["current_turn"]:
                    await send({"type": "error", "msg": "Not your turn"})
                    continue
                if not game["dice_rolled"]:
                    await send({"type": "error", "msg": "Roll first"})
                    continue

                piece_id = msg.get("piece_id")
                die_val = msg.get("die_val")

                if die_val not in game["moves_used"]:
                    await send({"type": "error", "msg": "Die value not available"})
                    continue

                result = apply_move(game, piece_id, die_val)
                if not result["ok"]:
                    await send({"type": "error", "msg": result.get("error")})
                    continue

                # Check remaining moves
                remaining_valid = compute_valid_moves(game, game["moves_used"])
                extra_turn = False

                if not game["winner"] and (not game["moves_used"] or not remaining_valid):
                    has_six = 6 in game["dice"]
                    extra_turn = next_turn(game, has_six)

                await room.broadcast({
                    "type": "piece_moved",
                    "piece_id": piece_id,
                    "die_val": die_val,
                    "events": result["events"],
                    "remaining_dice": game["moves_used"],
                    "valid_moves": remaining_valid if game["moves_used"] else [],
                    "extra_turn": extra_turn,
                    "game": game,
                })

            # ── CHAT ──
            elif action == "chat":
                if current_room:
                    p = current_room.players.get(player_id, {})
                    await current_room.broadcast({
                        "type": "chat",
                        "name": p.get("name", "?"),
                        "color": p.get("color", ""),
                        "msg": msg.get("msg", "")[:200],
                    })

            # ── LEAVE ROOM ──
            elif action == "leave_room":
                if current_room:
                    await handle_disconnect(current_room, player_id)
                    current_room = None

    except WebSocketDisconnect:
        pass
    finally:
        if current_room:
            await handle_disconnect(current_room, player_id)

async def handle_disconnect(room: Room, player_id: str):
    if player_id not in room.players:
        return
    name = room.players[player_id].get("name", "Player")
    del room.players[player_id]
    await room.broadcast({"type": "player_left", "player_id": player_id, "name": name, "players": room.player_list()})
    if not room.players:
        rooms.pop(room.code, None)

@app.get("/pom.properties")
async def get_pom_properties():
    pom_path = os.path.join(os.path.dirname(__file__), "..", "pom.properties")
    if os.path.exists(pom_path):
        return FileResponse(pom_path)
    return {"error": "File not found"}

# ── Serve frontend ──────────────────────────────────────────────────────────
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app.get("/")
    async def get_index():
        return FileResponse(os.path.join(frontend_path, "index.html"))