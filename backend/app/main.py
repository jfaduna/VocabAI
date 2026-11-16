from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.vocabulary import router as vocabulary_router


app = FastAPI(
    title="VocabAI API",
    description="Voice-powered vocabulary assistant",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to VocabAI API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


app.include_router(
    vocabulary_router,
    prefix="/api/v1",
)
