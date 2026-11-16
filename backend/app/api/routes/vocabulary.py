import logging

from fastapi import APIRouter, HTTPException
from openai import APIConnectionError, APIStatusError

from app.schemas.vocabulary import (
    VocabularyRequest,
    VocabularyExplanation,
)
from app.services.vocabulary_service import explain_vocabulary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vocabulary", tags=["Vocabulary"])


@router.post("/explain", response_model=VocabularyExplanation)
async def explain(request: VocabularyRequest):
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

    try:
        return await explain_vocabulary(text)

    except APIStatusError as exc:
        logger.exception(
            "OpenAI API error: status=%s, request_id=%s",
            exc.status_code,
            exc.request_id,
        )
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI returned status {exc.status_code}. Check backend logs.",
        )

    except APIConnectionError:
        logger.exception("Could not connect to OpenAI API.")
        raise HTTPException(
            status_code=502,
            detail="Could not connect to OpenAI.",
        )
