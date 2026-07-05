from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.routers import auth as auth_router
from app.routers import reports as reports_router
import app.models  # noqa: F401 — ensure models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic for production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="LabInsight AI API",
    description="Clinical Blood Report Intelligence Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://labinsight.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(reports_router.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "LabInsight AI"}
