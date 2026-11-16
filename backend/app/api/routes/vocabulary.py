from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.vocabulary import (
    VocabularyRequest,
    VocabularyRecord,
)
from app.services.vocabulary_repository import (
    create_vocabulary,
    get_vocabulary_history,
    get_vocabulary_by_id,
)
from app.services.vocabulary_service import explain_vocabulary


router = APIRouter(
    prefix="/vocabulary",
    tags=["Vocabulary"],
)


@router.post("/explain", response_model=VocabularyRecord)
async def explain(
    request: VocabularyRequest,
    db: AsyncSession = Depends(get_db),
):
    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    if len(text) > 500:
        raise HTTPException(
            status_code=400,
            detail="Text must not exceed 500 characters.",
        )

    explanation = await explain_vocabulary(text)

    return await create_vocabulary(db, explanation)


@router.get("/history", response_model=list[VocabularyRecord])
async def history(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await get_vocabulary_history(
        db,
        limit=limit,
        offset=offset,
    )


@router.get("/{vocabulary_id}", response_model=VocabularyRecord)
async def get_vocabulary(
    vocabulary_id: int,
    db: AsyncSession = Depends(get_db),
):
    vocabulary = await get_vocabulary_by_id(
        db,
        vocabulary_id,
    )

    if vocabulary is None:
        raise HTTPException(
            status_code=404,
            detail="Vocabulary not found.",
        )

    return vocabulary
