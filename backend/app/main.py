import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routes import forms, responses
from app.seed import seed_db
from app.models import Form

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import SessionLocal
    
    # Entire startup wrapped in try/except for multi-worker safety with SQLite
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Run seed if database is empty
        db = SessionLocal()
        try:
            if db.query(Form).first() is None:
                print("Database is empty. Running seed...")
                seed_db()
        finally:
            db.close()
    except Exception as e:
        print(f"Startup init skipped (likely another worker handled it): {e}")
        
    yield
    print("Shutting down...")

app = FastAPI(title="Typeform Clone API", lifespan=lifespan)

# CORS middleware — reads allowed origins from env var for deployment flexibility
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(forms.router)
app.include_router(responses.router)

@app.get("/")
def root():
    return {"message": "Welcome to Typeform Clone API"}
