from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos HTTP
    allow_headers=["*"],  # Permite todos los headers
)

app.include_router(router)

@app.get("/health")
async def health_check():
    """Health check endpoint para Railway"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "AI Data Analyzer API is running"}
