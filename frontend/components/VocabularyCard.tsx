
"use client";

import type { VocabularyExplanation } from "@/types/vocabulary";

interface Props {
    vocabulary: VocabularyExplanation;
    onSpeak: (text: string) => void;
}

export default function VocabularyCard({
    vocabulary,
    onSpeak,
}: Props) {
    return (
        <article className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-bold text-gray-900">
                        {vocabulary.term}
                    </h2>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                        {vocabulary.part_of_speech}
                    </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                    {vocabulary.pronunciation}
                </p>
            </div>

            <section>
                <h3 className="font-semibold text-gray-900">Definition</h3>
                <p className="mt-1 text-gray-700">
                    {vocabulary.definition}
                </p>
            </section>

            <section className="rounded-xl bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">
                    In simple terms
                </h3>

                <p className="mt-1 text-blue-800">
                    {vocabulary.simple_explanation}
                </p>

                <button
                    onClick={() =>
                        onSpeak(vocabulary.simple_explanation)
                    }
                    className="mt-3 text-sm font-medium text-blue-700 hover:underline"
                >
                    🔊 Read aloud
                </button>
            </section>

            <section>
                <h3 className="font-semibold text-gray-900">
                    Example sentences
                </h3>

                <ul className="mt-2 list-disc space-y-2 pl-5 text-gray-700">
                    {vocabulary.example_sentences.map(
                        (sentence, index) => (
                            <li key={index}>{sentence}</li>
                        )
                    )}
                </ul>
            </section>

            <section>
                <h3 className="font-semibold text-gray-900">
                    Synonyms
                </h3>

                <div className="mt-2 flex flex-wrap gap-2">
                    {vocabulary.synonyms.map((word) => (
                        <span
                            key={word}
                            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                        >
                            {word}
                        </span>
                    ))}
                </div>
            </section>

            {vocabulary.context_note && (
                <section className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900">
                        Context note
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                        {vocabulary.context_note}
                    </p>
                </section>
            )}

            <button
                onClick={() =>
                    onSpeak(
                        `${vocabulary.term}. ${vocabulary.definition}. ${vocabulary.simple_explanation}`
                    )
                }
                className="w-full rounded-lg border px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                🔊 Read entire explanation
            </button>
        </article>
    );
}
