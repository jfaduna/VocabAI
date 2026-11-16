
import type { VocabularyExplanation } from "@/types/vocabulary";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface VocabularyRecord extends VocabularyExplanation {
    id: number;
    created_at: string;
}

export async function explainVocabulary(
    text: string
): Promise<VocabularyRecord> {
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
            data.detail || "Unable to explain vocabulary."
        );
    }

    return data;
}


export async function getVocabularyHistory(
    limit = 50,
    offset = 0
): Promise<VocabularyRecord[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/vocabulary/history?limit=${limit}&offset=${offset}`,
        {
            cache: "no-store",
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || "Unable to retrieve vocabulary history."
        );
    }

    return data;
}


export async function getVocabularyById(
    id: number
): Promise<VocabularyRecord> {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/vocabulary/${id}`,
        {
            cache: "no-store",
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || "Unable to retrieve vocabulary."
        );
    }

    return data;
}
