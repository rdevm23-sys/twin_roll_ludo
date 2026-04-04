import json
import random
import string
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from .logic import (
    init_game_state,
    roll_dice,
    compute_valid_moves,
    apply_move,
    next_turn,
)
from .models import Room


rooms: dict[str, Room] = {}


def gen_code(n: int) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def gen_room_code() -> str:
    """3-digit numeric code (000–999) for quick testing and sharing."""
    return f"{random.randint(0, 999):03d}"


def normalize_room_code(raw: str) -> str:
    digits = "".join(c for c in (raw or "") if c.isdigit())
    if not digits:
        return ""
    padded = digits.zfill(3)
    return padded[-3:] if len(padded) > 3 else padded


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
                code = gen_room_code()
                while code in rooms:
                    code = gen_room_code()
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
                code = normalize_room_code(msg.get("code", ""))
                room = rooms.get(code) if code else None
                if not code:
                    await send({"type": "error", "msg": "Enter a 3-digit room code"})
                elif not room:
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
                    code = gen_room_code()
                    while code in rooms:
                        code = gen_room_code()
                    room = Room(code=code, host_id=player_id, host_name=name,
                                max_players=desired_players, twin_dice=twin_dice, is_public=True)
                    rooms[code] = room
                    color = room.assign_color()
                    room.players[player_id] = {"ws": ws, "name": name, "color": color, "ready": False}
                    current_room = room
                    await send({**room.full_state(), "your_color": color, "your_id": player_id, "type": "waiting_for_players"})

            # ── START SINGLE PLAYER ──
            elif action == "start_single_player":
                code = gen_room_code()
                while code in rooms:
                    code = gen_room_code()
                room = Room(
                    code=code,
                    host_id=player_id,
                    host_name=msg.get("name", "Player"),
                    max_players=1, # Single player
                    twin_dice=False, # Default to normal dice for single player
                    is_public=False,
                )
                rooms[code] = room
                color = room.assign_color()
                room.players[player_id] = {"ws": ws, "name": msg.get("name","Player"), "color": color, "ready": True} # Auto-ready
                current_room = room

                # Immediately start the game for single player
                colors = [color] # Only one player's color
                room.game = init_game_state(colors, "singleplayer", room.twin_dice)
                room.started = True
                await send({"type": "game_start", "game": room.game, "players": room.player_list(), "your_color": color, "your_id": player_id})
            # ── REJOIN ROOM ──
            elif action == "rejoin_room":
                code = normalize_room_code(msg.get("code", ""))
                pid_to_rejoin = msg.get("player_id")
                room = rooms.get(code) if code else None

                if room and pid_to_rejoin in room.players and room.players[pid_to_rejoin].get('ws') is None:
                    current_room = room
                    player_id = pid_to_rejoin # Adopt the persistent ID for this connection
                    player_data = room.players[pid_to_rejoin]
                    player_data['ws'] = ws

                    await send({**room.full_state(), "your_id": pid_to_rejoin, "your_color": player_data['color']})
                    if room.game:
                        await send({
                            "type": "game_state_full",
                            "game": room.game,
                            "players": room.player_list(),
                            "your_id": pid_to_rejoin,
                            "your_color": player_data["color"],
                        })
                    await room.broadcast({"type": "player_reconnected", "player_id": pid_to_rejoin, "players": room.player_list()}, exclude=pid_to_rejoin)
                else:
                    await send({"type": "error", "msg": "Could not rejoin room."})

            # ── TOGGLE READY ──
            elif action == "toggle_ready":
                if current_room and player_id in current_room.players:
                    p = current_room.players[player_id]
                    p["ready"] = not p.get("ready", False)
                    await current_room.broadcast({"type": "player_ready", "players": current_room.player_list()})

                    # Auto-start if everyone ready and min 2 players
                    all_ready = all(pp.get("ready") for pp in current_room.players.values())
                    if all_ready and len(current_room.players) >= 2:
                        player_pids = list(current_room.players.keys())
                        random.shuffle(player_pids)
                        if len(player_pids) == 2:
                            pair = random.choice([("red", "yellow"), ("green", "blue")])
                            current_room.players[player_pids[0]]["color"] = pair[0]
                            current_room.players[player_pids[1]]["color"] = pair[1]
                        colors = [current_room.players[pid]["color"] for pid in player_pids]
                        current_room.game = init_game_state(colors, "multiplayer", current_room.twin_dice)
                        current_room.started = True
                        pl = current_room.player_list()
                        base = {"type": "game_start", "game": current_room.game, "players": pl}
                        for pid, pdata in list(current_room.players.items()):
                            pws = pdata.get("ws")
                            if not pws:
                                continue
                            try:
                                payload = {**base, "your_id": pid, "your_color": pdata["color"]}
                                await pws.send_text(json.dumps(payload))
                            except Exception:
                                pass

            # ── ROLL DICE ──
            elif action == "roll_dice":
                room = current_room
                if not room or not room.started: continue
                game = room.game
                if game["winner"] or game["dice_rolled"]: continue
                p = room.players.get(player_id)
                if not p or p["color"] != game["current_turn"]:
                    await send({"type": "error", "msg": "Not your turn"})
                    continue

                rolls = roll_dice(game["twin_dice"])
                game["dice"] = rolls
                game["dice_rolled"] = True
                game["moves_used"] = list(rolls)

                valid_moves = compute_valid_moves(game, game["moves_used"])

                if not valid_moves:
                    has_six = 6 in rolls
                    extra_turn = next_turn(game, has_six)
                    await room.broadcast({
                        "type": "dice_rolled", "player_id": player_id, "rolls": rolls,
                        "valid_moves": [], "auto_pass": True, "extra_turn": extra_turn, "game": game,
                    })
                else:
                    await room.broadcast({
                        "type": "dice_rolled", "player_id": player_id, "rolls": rolls,
                        "valid_moves": valid_moves, "game": game,
                    })

            # ── MOVE PIECE ──
            elif action == "move_piece":
                room = current_room
                if not room or not room.started: continue
                game = room.game
                if game["winner"]: continue
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

                remaining_valid = compute_valid_moves(game, game["moves_used"])
                extra_turn = False

                if not game["winner"] and (not game["moves_used"] or not remaining_valid):
                    has_six = 6 in game["dice"]
                    extra_turn = next_turn(game, has_six)

                await room.broadcast({
                    "type": "piece_moved", "piece_id": piece_id, "die_val": die_val,
                    "events": result["events"], "remaining_dice": game["moves_used"],
                    "valid_moves": remaining_valid if game["moves_used"] else [],
                    "extra_turn": extra_turn, "game": game,
                })

            # ── CHAT ──
            elif action == "chat":
                if current_room:
                    p = current_room.players.get(player_id, {})
                    await current_room.broadcast({
                        "type": "chat", "name": p.get("name", "?"), "color": p.get("color", ""),
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

    player = room.players[player_id]
    name = player.get("name", "Player")

    if not room.started:
        # In lobby, leaving is permanent
        del room.players[player_id]
        await room.broadcast({"type": "player_left", "player_id": player_id, "name": name, "players": room.player_list()})
        if not room.players and room.code in rooms:
            del rooms[room.code]
    else:
        # In game, mark as disconnected to allow rejoin
        player['ws'] = None
        await room.broadcast({"type": "player_disconnected", "player_id": player_id, "name": name, "players": room.player_list()})