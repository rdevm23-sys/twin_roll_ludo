import os
from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

@router.get("/pom.properties")
async def get_pom_properties():
    pom_path = os.path.join(os.path.dirname(__file__), "..", "pom.properties")
    if os.path.exists(pom_path):
        return FileResponse(pom_path)
    return {"error": "File not found"}

@router.get("/")
async def get_index():
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
    return FileResponse(os.path.join(frontend_path, "index.html"))

@router.get("/game/{code}")
async def get_game_index(code: str):
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
    return FileResponse(os.path.join(frontend_path, "index.html"))