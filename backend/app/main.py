import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import router as api_router
from app.services.neo4j_service import neo4j_service
from app.services import records_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("doctompt_backend")

async def periodic_backup_task():
    """Background task running automated SQLite backups every 6 hours"""
    while True:
        try:
            await asyncio.sleep(6 * 3600)  # Every 6 hours
            logger.info("Executing automated SQLite database backup...")
            records_db.create_backup()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Periodic backup failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing DoctoMPT LangChain + Neo4j services...")
    # Attempt connecting to Neo4j Vector Store on startup
    try:
        neo4j_service.init_vector_store()
        logger.info("Neo4j vector store initialized successfully.")
    except Exception as e:
        logger.warning(f"Neo4j startup notice: {e}")

    # Start periodic database backup daemon
    backup_task = asyncio.create_task(periodic_backup_task())
    yield
    logger.info("Shutting down DoctoMPT backend...")
    backup_task.cancel()
    neo4j_service.close()

app = FastAPI(
    title="DoctoMPT AI Backend (AWS Server)",
    description="LangChain + Gemini + Neo4j Vector RAG with Memory for Indian Medicines",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration allowing Vercel Next.js client & localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "DoctoMPT-RAG-Backend",
        "model": settings.GEMINI_MODEL,
        "neo4j_configured": bool(settings.NEO4J_URI),
        "storage": "AWS EC2 SQLite",
        "memory_tier": "t3.small (2GB RAM)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
