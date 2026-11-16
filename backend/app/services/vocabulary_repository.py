from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vocabulary import Vocabulary
from app.schemas.vocabulary import VocabularyExplanation


async def create_vocabulary(
    db: AsyncSession,
    explanation: VocabularyExplanation,
) -> Vocabulary:
    vocabulary = Vocabulary(**explanation.model_dump())

    db.add(vocabulary)

    await db.commit()
    await db.refresh(vocabulary)

    return vocabulary


async def get_vocabulary_history(
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
) -> list[Vocabulary]:
    statement = (
        select(Vocabulary)
        .order_by(Vocabulary.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(statement)

    return list(result.scalars().all())


async def get_vocabulary_by_id(
    db: AsyncSession,
    vocabulary_id: int,
) -> Vocabulary | None:
    statement = select(Vocabulary).where(Vocabulary.id == vocabulary_id)

    result = await db.execute(statement)

    return result.scalar_one_or_none()
