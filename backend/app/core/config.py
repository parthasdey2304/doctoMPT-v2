from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    GEMINI_LIVE_MODEL: str = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.8-flash-live")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")

    # Neo4j Settings
    NEO4J_URI: str = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    NEO4J_USERNAME: str = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "doctompt_secret_password")
    NEO4J_DATABASE: str = os.getenv("NEO4J_DATABASE", "neo4j")

    # Neo4j Vector Settings
    NEO4J_VECTOR_INDEX_NAME: str = os.getenv("NEO4J_VECTOR_INDEX_NAME", "medicine_embeddings")
    NEO4J_NODE_LABEL: str = os.getenv("NEO4J_NODE_LABEL", "Medicine")
    NEO4J_TEXT_PROPERTY: str = os.getenv("NEO4J_TEXT_PROPERTY", "details")
    NEO4J_EMBEDDING_PROPERTY: str = os.getenv("NEO4J_EMBEDDING_PROPERTY", "embedding")

    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "doctompt_secure_bridge_2026")
    CORS_ORIGINS: List[str] = [
        "https://docto-mpt.vercel.app",
        "https://doctompt.vercel.app",
        "https://doctompt-aws-hybrid.vercel.app",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
