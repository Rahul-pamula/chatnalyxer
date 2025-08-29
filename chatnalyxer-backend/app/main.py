from fastapi import FastAPI
from app import models
from app.database import engine
from app.routers import users, groups, messages, auth

# ✅ Create database tables automatically (for dev only)
models.Base.metadata.create_all(bind=engine)

# ✅ Initialize FastAPI
app = FastAPI(
    title="Chatnalyxer API",
    description="Backend API for Chatnalyxer (users, groups, messages, auth)",
    version="1.0.0"
)

# ✅ Healthcheck endpoints
@app.get("/")
def root():
    return {"message": "Chatnalyxer backend running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ✅ Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(messages.router)
