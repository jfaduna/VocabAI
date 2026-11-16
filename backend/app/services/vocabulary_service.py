from app.core.config import settings
from app.schemas.vocabulary import VocabularyExplanation
from app.services.openai_client import client


async def explain_vocabulary(text: str) -> VocabularyExplanation:
    instructions = """
    You are VocabAI, a friendly vocabulary assistant.

    Help readers understand unfamiliar English words and phrases.

    Return:
    - term
    - pronunciation
    - part_of_speech
    - definition
    - simple_explanation
    - example_sentences (exactly two)
    - synonyms (up to five)
    - context_note

    Keep explanations concise and easy to understand.
    Return valid JSON matching the requested schema.
    """

    response = await client.beta.chat.completions.parse(
        model=settings.gemini_model,
        messages=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": text},
        ],
        response_format=VocabularyExplanation,
    )

    result = response.choices[0].message.parsed

    if result is None:
        raise ValueError("The AI returned no structured response.")

    return result
