import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext

from .database import create_player, get_player_by_username

# --- Configuration ---
# It's crucial to set a strong, secret key in your .env file
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_env_for_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Router ---
router = APIRouter(prefix="/api", tags=["auth"])

# --- Pydantic Models ---
class Token(BaseModel):
    token: str
    player: dict

class PlayerCreate(BaseModel):
    username: str
    password: str

class PlayerLogin(BaseModel):
    username: str
    password: str

# --- Helper Functions ---
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Endpoints ---
@router.post("/register", response_model=Token)
async def register_user(player: PlayerCreate):
    """
    Registers a new player and returns a token, logging them in immediately.
    """
    db_player = get_player_by_username(player.username)
    if db_player:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    hashed_password = pwd_context.hash(player.password)
    new_player = create_player(player.username, hashed_password)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_player["username"]}, expires_delta=access_token_expires
    )

    return {"token": access_token, "player": new_player}

@router.post("/login", response_model=Token)
async def login_user(player_login: PlayerLogin):
    """
    Logs in an existing player and returns a token.
    """
    db_player = get_player_by_username(player_login.username)
    if not db_player or not pwd_context.verify(player_login.password, db_player["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_player["username"]}, expires_delta=access_token_expires
    )

    return {"token": access_token, "player": db_player}