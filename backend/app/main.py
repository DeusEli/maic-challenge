from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION
)

# CORS configurado desde variables de entorno
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
async def health_check():
    """Health check endpoint para Railway"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "AI Data Analyzer API is running"}
