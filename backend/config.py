import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

BASE_DIR   = Path(__file__).parent.parent
DATA_DIR   = BASE_DIR / "data"
VECTOR_DIR = DATA_DIR / "vectordb"
DEMO_DIR   = DATA_DIR / "demo_docs"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL      = os.getenv("LLM_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

USE_GROQ     = os.getenv("USE_GROQ", "false").lower() == "true"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

USE_HF   = os.getenv("USE_HF", "false").lower() == "true"
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")

USE_OLLAMA  = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

EMBED_MODEL = "all-MiniLM-L6-v2"

CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
N_RESULTS     = int(os.getenv("N_RESULTS", 5))
BM25_WEIGHT   = float(os.getenv("BM25_WEIGHT", 0.4))  # BM25 weight + vector weight must = 1.0

FAITH_THRESHOLD = float(os.getenv("FAITH_THRESHOLD", 0.60))  # below this score → retry
MAX_RETRIES     = int(os.getenv("MAX_RETRIES", 2))  # max attempts before giving up

USE_RAGAS     = os.getenv("USE_RAGAS", "false").lower() == "true"
RAGAS_TIMEOUT = 60
