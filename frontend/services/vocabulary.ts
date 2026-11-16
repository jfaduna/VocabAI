
import type { VocabularyExplanation } from "@/types/vocabulary";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function explainVocabulary(
    text: string
): Promise<VocabularyExplanation> {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/vocabulary/explain`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || "Unable to explain this vocabulary."
        );
    }

    return data as VocabularyExplanation;
}
