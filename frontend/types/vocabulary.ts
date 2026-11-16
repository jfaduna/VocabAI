
export interface VocabularyExplanation {
    term: string;
    pronunciation: string;
    part_of_speech: string;
    definition: string;
    simple_explanation: string;
    example_sentences: string[];
    synonyms: string[];
    context_note: string;
}

export interface VocabularyRecord extends VocabularyExplanation {
    id: number;
    created_at: string;
}
