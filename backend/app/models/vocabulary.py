from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Vocabulary(Base):
    __tablename__ = "vocabulary"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    term: Mapped[str] = mapped_column(
        String(255),
        index=True,
    )

    pronunciation: Mapped[str] = mapped_column(String(255))

    part_of_speech: Mapped[str] = mapped_column(String(100))

    definition: Mapped[str] = mapped_column(Text)

    simple_explanation: Mapped[str] = mapped_column(Text)

    example_sentences: Mapped[list[str]] = mapped_column(JSONB)

    synonyms: Mapped[list[str]] = mapped_column(JSONB)

    context_note: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
