from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VocabularyRequest(BaseModel):
    text: str


class VocabularyExplanation(BaseModel):
    term: str
    pronunciation: str
    part_of_speech: str
    definition: str
    simple_explanation: str
    example_sentences: list[str]
    synonyms: list[str]
    context_note: str


class VocabularyRecord(VocabularyExplanation):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
