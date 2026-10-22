from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def home():
    return {
        "message": "AI Lead Manager API is running"
    }
