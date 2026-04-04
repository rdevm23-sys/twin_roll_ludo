import random
import time
from typing import Optional

from .config import (
    START_SQUARES,
    SAFE_SQUARES,
    HOME_COLUMN_ENTRY,
    HOME_COLUMN_LENGTH,
    TOTAL_TRACK,
)

def init_game_state(player_colors: list[str], mode: str, twin_dice: bool) -> dict:
    pieces = {}
    for color in player_colors:
        for i in range(4):
            pieces[f"{color}_{i}"] = {
                "color": color, "index": i, "pos": -1,
                "track_pos": -1, "finished": False,
            }
    return {
        "pieces": pieces, "players": player_colors, "current_turn": player_colors[0],
        "mode": mode, "twin_dice": twin_dice, "dice": [], "dice_rolled": False,
        "moves_used": [], "winner": None, "turn_start_time": time.time(),
        "consecutive_sixes": 0,
    }

def roll_dice(twin: bool) -> list[int]:
    return [random.randint(1, 6), random.randint(1, 6)] if twin else [random.randint(1, 6)]

def compute_valid_moves(state: dict, dice_remaining: list[int]) -> list[dict]:
    color = state["current_turn"]
    valid = []
    pieces_of_color = [p for p in state["pieces"].values() if p["color"] == color and not p["finished"]]
    for die_val in set(dice_remaining):
        for piece in pieces_of_color:
            move = try_move(state, piece, die_val, color)
            if move:
                valid.append({**move, "die_val": die_val})
    return valid

def try_move(state: dict, piece: dict, die_val: int, color: str) -> Optional[dict]:
    pid = f"{color}_{piece['index']}"

    if piece["pos"] == -1:
        return {"piece_id": pid, "from": -1, "to": "track", "track_to": START_SQUARES[color]-1, "captures": []} if die_val == 6 else None

    if piece["pos"] >= 100:
        col_pos = piece["pos"] - 100
        new_col = col_pos + die_val
        if new_col == HOME_COLUMN_LENGTH:
            return {"piece_id": pid, "from": piece["pos"], "to": "finish", "captures": []}
        elif new_col < HOME_COLUMN_LENGTH:
            return {"piece_id": pid, "from": piece["pos"], "to": 100 + new_col, "captures": []}
        return None

    track_pos = piece["track_pos"]
    entry = HOME_COLUMN_ENTRY[color]
    start_idx = START_SQUARES[color] - 1
    steps_traveled = (track_pos - start_idx + TOTAL_TRACK) % TOTAL_TRACK
    steps_to_entry = (entry - start_idx + TOTAL_TRACK) % TOTAL_TRACK

    if steps_traveled < steps_to_entry and steps_traveled + die_val > steps_to_entry:
        col_pos = (steps_traveled + die_val) - steps_to_entry - 1
        if col_pos < HOME_COLUMN_LENGTH:
            return {"piece_id": pid, "from": piece["pos"], "to": 100 + col_pos, "captures": []}
        return None

    new_track = (track_pos + die_val) % TOTAL_TRACK
    captures = []
    if new_track not in SAFE_SQUARES:
        for other in state["pieces"].values():
            if other["color"] != color and other["track_pos"] == new_track:
                captures.append(f"{other['color']}_{other['index']}")

    return {"piece_id": pid, "from": piece["pos"], "to": new_track, "captures": captures, "is_track": True}

def apply_move(state: dict, piece_id: str, die_val: int) -> dict:
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
        piece["pos"] = piece["track_pos"] = move["track_to"]
        events.append({"type": "moved", "piece_id": piece_id, "to": move["track_to"]})
    elif isinstance(move["to"], int) and move["to"] >= 100:
        piece["pos"] = move["to"]
        piece["track_pos"] = -1
        events.append({"type": "moved", "piece_id": piece_id, "to": move["to"]})
    else:
        piece["pos"] = piece["track_pos"] = move["to"]
        events.append({"type": "moved", "piece_id": piece_id, "to": move["to"]})

    for cap_id in move.get("captures", []):
        cap = state["pieces"][cap_id]
        cap["pos"] = -1
        cap["track_pos"] = -1
        events.append({"type": "captured", "piece_id": cap_id})

    state["moves_used"].remove(die_val)

    if all(p["finished"] for p in state["pieces"].values() if p["color"] == color):
        state["winner"] = color
        events.append({"type": "winner", "color": color})

    return {"ok": True, "events": events}

def next_turn(state: dict, got_six: bool) -> bool:
    if got_six:
        state["consecutive_sixes"] += 1
        if state["consecutive_sixes"] < 3:
            state["dice"] = []
            state["dice_rolled"] = False
            state["moves_used"] = []
            return True

    state["consecutive_sixes"] = 0
    players = state["players"]
    idx = players.index(state["current_turn"])
    state["current_turn"] = players[(idx + 1) % len(players)]
    state["dice"] = []
    state["dice_rolled"] = False
    state["moves_used"] = []
    return False