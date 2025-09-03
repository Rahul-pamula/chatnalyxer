from fastapi import FastAPI
from app import models
from app.database import engine
from app.routers import users, groups, messages, auth
<<<<<<< HEAD

=======
from fastapi.middleware.cors import CORSMiddleware
>>>>>>> feature/backend-auth
# ✅ Create database tables automatically (for dev only)
models.Base.metadata.create_all(bind=engine)

# ✅ Initialize FastAPI
app = FastAPI(
    title="Chatnalyxer API",
    description="Backend API for Chatnalyxer (users, groups, messages, auth)",
    version="1.0.0"
)

<<<<<<< HEAD
=======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # during dev allow all, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

>>>>>>> feature/backend-auth
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
