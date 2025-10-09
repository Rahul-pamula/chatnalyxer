from fastapi import FastAPI
from app import models
from app.database import engine
from app.routers import auth, groups, dashboard, messages, whatsapp
from fastapi.middleware.cors import CORSMiddleware

# Auto-create tables (for dev only)
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI
app = FastAPI(
    title="Chatnalyxer API",
    description="Backend API for Chatnalyxer (users, groups, messages, auth)",
    version="1.0.0"
)

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all for dev
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck endpoints


@app.get("/")
def root():
    return {"message": "Chatnalyxer backend running 🚀"}


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers
app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(dashboard.router)
app.include_router(messages.router)
app.include_router(whatsapp.router)
