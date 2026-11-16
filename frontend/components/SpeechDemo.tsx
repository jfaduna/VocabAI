
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { explainVocabulary, getVocabularyHistory } from "@/services/vocabulary";
import VocabularyCard from "@/components/VocabularyCard";
import type { VocabularyRecord } from "@/types/vocabulary";

export default function SpeechDemo() {
    const {
        transcript,
        isListening,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        error: speechError,
    } = useSpeechRecognition();

    const [history, setHistory] = useState<VocabularyRecord[]>([]);
    const [explanation, setExplanation] = useState<VocabularyRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [continuousMode, setContinuousMode] = useState(false);

    // Load saved vocabulary from PostgreSQL when the component mounts.
    useEffect(() => {
        let cancelled = false;

        async function loadHistory() {
            try {
                const records = await getVocabularyHistory();

                if (!cancelled) {
                    setHistory(records);
                }
            } catch (error) {
                console.error("Failed to load vocabulary history:", error);
            }
        }

        loadHistory();

        return () => {
            cancelled = true;
        };
    }, []);

    // Submit the recognized text to the backend.
    const handleExplain = useCallback(async (text: string) => {
        const cleanedText = text.trim();

        if (!cleanedText || loading) return;

        setLoading(true);
        setApiError(null);
        setExplanation(null);

        try {
            const result = await explainVocabulary(cleanedText);

            setExplanation(result);

            setHistory((previous) => [
                result,
                ...previous.filter((item) => item.id !== result.id),
            ]);
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : "Unable to explain this vocabulary."
            );
        } finally {
            setLoading(false);
        }
    }, [loading]);

    // Stop listening and explain the recognized text.
    const handleSubmit = async () => {
        stopListening();

        if (transcript.trim()) {
            await handleExplain(transcript);
        }
    };

    // Text-to-speech using the browser's Speech Synthesis API.
    const handleSpeak = (text: string) => {
        if (!("speechSynthesis" in window)) {
            setApiError("Text-to-speech is not supported by this browser.");
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;

        window.speechSynthesis.speak(utterance);
    };

    const handleHistoryClick = async (item: VocabularyRecord) => {
        setExplanation(item);
        setApiError(null);
    };

    if (!isSupported) {
        return (
            <div className="rounded-lg border p-6">
                <p>
                    Speech recognition is not supported by this browser.
                    Try a supported browser such as Chrome.
                </p>
            </div>
        );
    }

    return (
        <main className="mx-auto max-w-3xl space-y-8 p-6">
            <header>
                <h1 className="text-3xl font-bold">VocabAI</h1>
                <p className="mt-2 text-gray-500">
                    Speak an unfamiliar word or phrase and let AI explain it.
                </p>
            </header>

            {/* Speech recognition */}
            <section className="space-y-4 rounded-xl border p-6">
                <h2 className="text-xl font-semibold">Voice input</h2>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={continuousMode}
                        onChange={(event) => setContinuousMode(event.target.checked)}
                        disabled={isListening}
                    />
                    Continuous listening
                </label>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => startListening(continuousMode ? "continuous" : "push-to-talk")}
                        disabled={isListening || loading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                        Start listening
                    </button>

                    <button
                        onClick={stopListening}
                        disabled={!isListening}
                        className="rounded-lg bg-gray-200 px-4 py-2 text-gray-900 disabled:opacity-50"
                    >
                        Stop listening
                    </button>

                    <button
                        onClick={() => {
                            resetTranscript();
                            setExplanation(null);
                            setApiError(null);
                        }}
                        disabled={isListening}
                    >
                        Clear
                    </button>
                </div>

                <div className="min-h-24 rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">
                        {isListening ? "Listening..." : "Your recognized speech will appear here."}
                    </p>
                    <p className="mt-2 text-gray-900">{transcript || "..."}</p>
                </div>

                {speechError && (
                    <p className="text-sm text-red-600">{speechError}</p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={!transcript.trim() || loading}
                    className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? "Generating explanation..." : "Explain with AI"}
                </button>
            </section>

            {/* API errors */}
            {apiError && (
                <div className="rounded-lg bg-red-50 p-4 text-red-700">
                    {apiError}
                </div>
            )}

            {/* Vocabulary explanation */}
            {explanation && (
                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Explanation</h2>
                    <VocabularyCard
                        vocabulary={explanation}
                        onSpeak={handleSpeak}
                    />
                </section>
            )}

            {/* Saved vocabulary */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">
                    Recent vocabulary ({history.length})
                </h2>

                {history.length === 0 ? (
                    <p className="text-gray-500">No saved vocabulary yet.</p>
                ) : (
                    <div className="space-y-2">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleHistoryClick(item)}
                                className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-gray-50"
                            >
                                <div>
                                    <p className="font-semibold">{item.term}</p>
                                    <p className="text-sm text-gray-500">
                                        {item.definition}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
