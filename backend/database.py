import oracledb
from contextlib import contextmanager
import os
from dotenv import load_dotenv

load_dotenv()

# ── Connection config ─────────────────────────────────
DB_USER = os.getenv("DB_USER", "ADMIN")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DSN = os.getenv("DB_DSN")

if not DB_PASSWORD or not DB_DSN:
    raise ValueError(
        "DB_PASSWORD and DB_DSN environment variables must be set. "
        "Create a .env file in the backend directory with these values."
    )

# ── Connection pool ───────────────────────────────────
pool = None

def init_pool():
    global pool
    pool = oracledb.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_DSN,
        min=1,
        max=5,
        increment=1,
    )
    print("Oracle DB pool initialized")

@contextmanager
def get_conn():
    conn = pool.acquire()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.release(conn)

# ── Schema creation ───────────────────────────────────
def create_tables():
    with get_conn() as conn:
        cursor = conn.cursor()

        # Drop tables for a clean slate in development - helps with auth changes
        # WARNING: This will delete all player data.
        cursor.execute("""
            BEGIN
                EXECUTE IMMEDIATE 'DROP TABLE players CASCADE CONSTRAINTS';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -942 THEN RAISE; END IF;
            END;
        """)
        cursor.execute("""
            BEGIN
                EXECUTE IMMEDIATE 'DROP TABLE player_stats';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -942 THEN RAISE; END IF;
            END;
        """)

        cursor.execute("""
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE players (
                        id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                        username    VARCHAR2(50) UNIQUE NOT NULL,
                        password    VARCHAR2(255) NOT NULL,
                        avatar      VARCHAR2(10) DEFAULT ''🎲'',
                        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN RAISE; END IF;
            END;
        """)

        cursor.execute("""
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE games (
                        id          VARCHAR2(36) PRIMARY KEY,
                        "mode"      VARCHAR2(20) NOT NULL,
                        twin_dice   NUMBER(1) DEFAULT 0,
                        winner_id   NUMBER,
                        duration    NUMBER,
                        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN RAISE; END IF;
            END;
        """)

        cursor.execute("""
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE game_players (
                        id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                        game_id     VARCHAR2(36) NOT NULL,
                        player_id   NUMBER,
                        color       VARCHAR2(10) NOT NULL,
                        position    NUMBER DEFAULT 0,
                        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN RAISE; END IF;
            END;
        """)

        cursor.execute("""
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE player_stats (
                        player_id       NUMBER PRIMARY KEY,
                        games_played    NUMBER DEFAULT 0,
                        wins            NUMBER DEFAULT 0,
                        losses          NUMBER DEFAULT 0,
                        pieces_cut      NUMBER DEFAULT 0,
                        sixes_rolled    NUMBER DEFAULT 0,
                        pieces_home     NUMBER DEFAULT 0,
                        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN RAISE; END IF;
            END;
        """)

        print("Tables created/verified ✅")

# ── Player queries ────────────────────────────────────
def create_player(username: str, password_hash: str) -> dict:
    with get_conn() as conn:
        cursor = conn.cursor()
        player_id_var = cursor.var(oracledb.DB_TYPE_NUMBER)
        cursor.execute("""
            INSERT INTO players (username, password)
            VALUES (:1, :2)
            RETURNING id INTO :3
        """, [username, password_hash, player_id_var])

        player_id = player_id_var.getvalue()[0]

        # Init stats
        cursor.execute("""
            INSERT INTO player_stats (player_id)
            VALUES (:1)
        """, [int(player_id)])

        return {"id": player_id, "username": username}

def get_player_by_username(username: str) -> dict | None:
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, password, avatar, created_at
            FROM players WHERE username = :1
        """, [username])
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "username": row[1],
            "password": row[2],
            "avatar": row[3],
            "created_at": str(row[4]),
        }

def get_player_stats(player_id: int) -> dict | None:
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.username, p.avatar,
                   s.games_played, s.wins, s.losses,
                   s.pieces_cut, s.sixes_rolled, s.pieces_home
            FROM players p
            JOIN player_stats s ON p.id = s.player_id
            WHERE p.id = :1
        """, [player_id])
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "username": row[0],
            "avatar": row[1],
            "games_played": row[2],
            "wins": row[3],
            "losses": row[4],
            "pieces_cut": row[5],
            "sixes_rolled": row[6],
            "pieces_home": row[7],
        }

def update_stats(player_id: int, **kwargs):
    if not kwargs:
        return
    sets = ", ".join(f"{k} = {k} + :{i+1}" for i, k in enumerate(kwargs))
    vals = list(kwargs.values()) + [player_id]
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE player_stats SET {sets}, updated_at = CURRENT_TIMESTAMP
            WHERE player_id = :{len(vals)}
        """, vals)

def save_game(game_id: str, mode: str, twin_dice: bool,
              winner_id: int | None, duration: int,
              players: list[dict]):
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO games (id, "mode", twin_dice, winner_id, duration)
            VALUES (:1, :2, :3, :4, :5)
        """, [game_id, mode, 1 if twin_dice else 0, winner_id, duration])

        for p in players:
            cursor.execute("""
                INSERT INTO game_players (game_id, player_id, color, position)
                VALUES (:1, :2, :3, :4)
            """, [game_id, p.get("player_id"), p["color"], p.get("position", 0)])

# ── Leaderboard ───────────────────────────────────────
def get_leaderboard(limit: int = 10) -> list[dict]:
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.username, p.avatar,
                   s.wins, s.games_played, s.pieces_cut
            FROM players p
            JOIN player_stats s ON p.id = s.player_id
            ORDER BY s.wins DESC, s.pieces_cut DESC
            FETCH FIRST :1 ROWS ONLY
        """, [limit])
        rows = cursor.fetchall()
        return [
            {
                "username": r[0],
                "avatar": r[1],
                "wins": r[2],
                "games_played": r[3],
                "pieces_cut": r[4],
            }
            for r in rows
        ]
