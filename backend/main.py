from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_allowed_origins
from routers import auth, health, leads


app = FastAPI(title="AI Lead Manager")


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(leads.router)
