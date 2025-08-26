from fastapi import FastAPI
from app import models
from app.database import engine
from app.routers import users, groups, messages

# Dev convenience: auto-create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chatnalyxer API")

@app.get("/")
def root():
    return {"message": "Chatnalyxer backend running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(users.router)
app.include_router(groups.router)
app.include_router(messages.router)
