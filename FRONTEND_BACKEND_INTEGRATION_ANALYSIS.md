# Frontend-Backend Integration Analysis

## Executive Summary

The Ludo project has **two distinct frontends** with different integration approaches:

1. **Old Frontend** (`/frontend`) - Uses WebSocket to communicate with FastAPI backend
2. **New LibreLudo Frontend** (`/libre_ludo`) - React/TypeScript client-side only (no backend communication)

The **coupling is decoupled by design**: The new frontend is completely independent and can run offline, while the backend serves the old frontend or can support future multiplayer features.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  FastAPI Backend (backend/)                             │
│  • Game logic server                                    │
│  • Room management                                      │
│  • WebSocket multiplayer coordination                  │
└────────────────────────────────────────┬────────────────┘
                                         │ WebSocket (/ws)
                                         │
                ┌────────────────────────┴────────────────────┐
                │                                             │
        ┌───────▼──────────┐                        ┌────────▼──────────┐
        │  Old Frontend      │                        │ New LibreLudo     │
        │  (vanilla JS)      │                        │ (React/TypeScript)│
        │  /frontend/        │                        │ /libre_ludo/      │
        │  - WebSocket       │                        │ - Client-only     │
        │  - Real-time sync  │                        │ - No backend call │
        │  - Multiplayer     │                        │ - Offline capable │
        └───────────────────┘                        └───────────────────┘
```

---

## API Endpoints (Backend)

**File:** `backend/routes.py`

### REST Endpoints (Minimal)

```
GET  /                  → Serves old frontend index.html
GET  /pom.properties    → Returns build properties file
GET  /game/{code}       → Serves old frontend (for deep linking)
```

**Status:** Routes are mostly stubs for serving static files. The main communication happens via WebSocket.

---

## WebSocket API (Old Frontend → Backend)

**File:** `frontend/js/ws.js` (client) + `backend/websocket.py` (server)

### WebSocket URL
```
ws://localhost:8000/ws  (or wss:// for HTTPS)
```

### Message Types (Client → Server)

| Action | Payload | Purpose |
|--------|---------|---------|
| `create_room` | `{ name, max_players, twin_dice, is_public }` | Create a new game room |
| `join_room` | `{ code, name }` | Join existing room by code |
| `find_match` | `{ max_players, twin_dice, name }` | Matchmaking (auto-create/join) |
| `start_single_player` | `{ name }` | Start solo game |
| `rejoin_room` | `{ code, player_id }` | Reconnect to room after disconnect |
| `toggle_ready` | `{}` | Mark ready to start |
| `roll_dice` | `{}` | Roll the dice |
| `move_piece` | `{ piece_id, die_val }` | Move a token |
| `chat` | `{ msg }` | Send chat message |
| `leave_room` | `{}` | Disconnect from room |

### Message Types (Server → Client)

| Type | Payload | Trigger |
|------|---------|---------|
| `connected` | `{ player_id }` | On connection |
| `room_state` / `waiting_for_players` | `{ code, players, max_players, twin_dice, started, is_public, host_id, your_color, your_id }` | Room joined |
| `game_start` | `{ game, players, your_color, your_id }` | All players ready |
| `game_state_full` | `{ game, players, your_id, your_color }` | Rejoin after disconnect |
| `dice_rolled` | `{ rolls, valid_moves, game, auto_pass, extra_turn }` | Dice rolled |
| `piece_moved` | `{ piece_id, die_val, events, remaining_dice, valid_moves, extra_turn, game }` | Move executed |
| `player_joined` | `{ players, name }` | Player entered room |
| `player_ready` | `{ players }` | Player toggled ready |
| `player_reconnected` | `{ player_id, name, players }` | Player rejoined |
| `player_disconnected` | `{ player_id, name, players }` | Player left game |
| `player_left` | `{ player_id, name, players }` | Player left lobby |
| `chat` | `{ name, color, msg }` | Chat message |
| `error` | `{ msg }` | Error condition |

---

## Game Logic & Data Flow

### Backend (Game Logic Authoritative)
**File:** `backend/logic.py`

The backend is the **source of truth** for game state in multiplayer mode:

```python
# Game State Structure
{
  "pieces": {
    "red_0": { "color": "red", "index": 0, "pos": -1, "track_pos": -1, "finished": False },
    "red_1": { ... },
    ...
  },
  "players": ["red", "green", "yellow", "blue"],
  "current_turn": "red",
  "mode": "multiplayer",  # or "singleplayer"
  "twin_dice": False,
  "dice": [5],
  "dice_rolled": True,
  "moves_used": [5],
  "winner": None,
  "consecutive_sixes": 0,
  "turn_start_time": <timestamp>
}
```

### Key Backend Functions

| Function | Purpose |
|----------|---------|
| `init_game_state(colors, mode, twin_dice)` | Initialize game |
| `roll_dice(twin: bool)` | Generate 1-2 random values (1-6) |
| `compute_valid_moves(state, dice)` | Calculate legal moves for current player |
| `try_move(state, piece, die_val, color)` | Validate single move |
| `apply_move(state, piece_id, die_val)` | Execute move and return events |
| `next_turn(state, has_six)` | Advance turn (or repeat if 6 rolled) |

**Logic Rules:**
- Piece unlocks (enters track) only on rolling a 6
- Safe squares: [1, 9, 14, 22, 27, 35, 40, 48]
- Home column entry at different squares for each color
- Captures happen when landing on opponent in unsafe squares
- Winning requires all 4 pieces to finish (reach position 200)

### Frontend (New LibreLudo - Client-Side Only)
**Files:** 
- `libre_ludo/src/state/slices/` - Redux state management
- `libre_ludo/src/game/` - Game logic (mirrored from backend)
- `libre_ludo/src/pages/Play/components/Game/Game.tsx` - Game coordinator

The new frontend **duplicates the backend logic** entirely on the client:

```typescript
// Client game state (Redux)
{
  players: []  // Player setup data
  board: { boardTileSize }
  dice: { rollBag, currentDice }
  session: { gameStartTime, gameInactiveTime }
}

// Game logic per file:
- game/players/logic.ts       → Player sequence & management
- game/tokens/logic.ts        → Token movement & tracking
- game/coords/logic.ts        → Position calculations
- game/bot/selectBestTokenForBot.ts → AI logic
```

**No backend calls** - Game runs entirely in-browser with no server interaction.

---

## Data Flow Examples

### Old Frontend: Creating a Room
```
Browser                                    Server
  │                                          │
  ├─────── WebSocket: create_room ────────>│
  │                                          │
  │<── Room created (room_state + player) ──┤
  │                                          │
  ├─────── WebSocket: toggle_ready ──────>│
  │                                          │
  │<── Player marked ready (player_ready) ──┤
  │                                          │
  │ (wait for other players)                 │
  │<── All ready (game_start + full state) ─┤
  │                                          │
  ├─────── WebSocket: roll_dice ──────────>│
  │                                          │
  │<── Dice rolled (dice_rolled + computed) ─┤
  │      valid_moves sent by server
```

### New Frontend: Rolling Dice
```
Browser (Redux + React)
  │
  ├─ dispatch(rollDiceThunk)
  │  ├─ Select random from rollBag
  │  ├─ dispatch(setDiceNumber)  → Redux state update
  │  └─ dispatch(handlePostDiceRollThunk)
  │     ├─ compute valid moves (client-side)
  │     ├─ animate tokens
  │     └─ auto-pass if no moves
  │
  └─ UI re-renders (no server involved)
```

---

## Coupling Analysis

### Tight Coupling (Old Frontend ↔ Backend)
- **Protocol:** WebSocket JSON messages
- **Game State:** Server authoritative
- **Validation:** Server-side move validation
- **Consistency:** Guaranteed by server broadcast
- **Risk:** Server down = game cannot continue
- **Advantage:** Anti-cheat, single source of truth

### Decoupled (New Frontend ↔ Backend)
- **Communication:** NONE currently
- **Game State:** Client-side only
- **Validation:** Client-side logic
- **Consistency:** Per-player only
- **Risk:** No online multiplayer
- **Advantage:** Offline-capable, no server dependency, user privacy

---

## Key Integration Points

### 1. Room Management
- Old Frontend: `game.js` sends `create_room`, `join_room`, `rejoin_room`
- Backend: `websocket.py` maintains `rooms` dict
- New Frontend: N/A (no rooms)

### 2. Game State Synchronization
- Old Frontend: Receives full game state on `game_start` and `game_state_full`
- Backend: Broadcasts updated state after each move
- New Frontend: Maintains local Redux state only

### 3. Move Validation
- Old Frontend: Sends `move_piece` to server, waits for validation
- Backend: Validates in `apply_move()`, returns events (capture, finish, etc.)
- New Frontend: Validates client-side before rendering

### 4. Turn Management
- Old Frontend: Server determines `next_turn` based on dice roll
- Backend: `next_turn()` checks for 6s, decides repeats
- New Frontend: `changeTurnThunk` handles turn changes client-side

### 5. Dice Rolling
- Old Frontend: Requests roll via `roll_dice` action
- Backend: `roll_dice()` generates random values and computes valid moves
- New Frontend: Uses local pseudo-random `rollBag` array

---

## Missing Integrations

The new LibreLudo frontend would need these changes for backend integration:

1. **WebSocket Client Hook**
   ```typescript
   useEffect(() => {
     const ws = new WebSocket('ws://...');
     // Connect on mount,  disconnect on unmount
   }, []);
   ```

2. **Message Handlers for:**
   - Room creation/joining
   - Game state updates
   - Move validation from server
   - Chat messages

3. **Redux Thunks** to dispatch server actions:
   - `createRoomThunk()`
   - `joinRoomThunk(code)`
   - `sendMoveToServerThunk(pieceId, dieVal)`

4. **Backend State Serialization** for Redux:
   - Map game state to Redux structure
   - Sync player positions on server updates

---

## File Map

| Component | Old Frontend | New Frontend | Backend |
|-----------|--------------|--------------|---------|
| **Room Management** | `game.js` (lines 147+) | - | `websocket.py` (lines 50-115) |
| **WebSocket Client** | `ws.js` (entire file) | - | - |
| **Game Logic** | `game.js` (recv only) | `src/game/*` | `logic.py` (entire file) |
| **Piece Movement** | `game.js` (lines 90-110) | `src/game/tokens/*` | `logic.py` (try_move) |
| **Dice Rolling** | `game.js` (lines 215+) | `src/state/thunks/rollDiceThunk.ts` | `logic.py` (roll_dice) |
| **State Serialization** | `game.js` properties | Redux slices in `src/state/*` | `models.py` (Room class) |
| **Chat** | `game.js` (lines 280+) | - | `websocket.py` (lines 273+) |
| **UI Rendering** | `ui.js` | React components in `src/pages/` | - |

---

## Summary: Coupling Tightness

| Aspect | Rating | Notes |
|--------|--------|-------|
| **API Contract** | ⭐⭐⭐ Tight | Fixed WebSocket message format |
| **Data Schema** | ⭐⭐⭐ Tight | Game state structure synchronized |
| **Behavioral Coupling** | ⭐⭐⭐ Tight | Server validates, client executes |
| **Deployment Coupling** | ⭐ Loose | Each can run independently |
| **Code Reusability** | ⭐⭐ Low | No shared TypeScript/Python types |

**Overall:** The architecture supports **two independent applications**:
- Old frontend is **tightly coupled** to backend (cannot work offline)
- New frontend is **completely decoupled** (client-only, no backend needed)
- Backend is **ready for multiplayer** but new frontend doesn't use it yet

**For true integration**: New frontend would need a WebSocket layer to communicate with the backend, matching the old frontend's message protocol.
