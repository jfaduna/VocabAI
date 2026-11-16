from fastapi import FastAPI

app = FastAPI(
    title="VocabAI API",
    description="Voice-powered vocabulary assistance",
    version="0.1.0",
)


@app.get("/")
async def root():
    return {"message": "Welcome to VocabAI API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
