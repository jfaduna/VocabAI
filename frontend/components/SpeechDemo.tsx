
"use client";

import { useState } from "react";

import {
    useSpeechRecognition,
    type ListeningMode,
} from "@/hooks/useSpeechRecognition";

import { explainVocabulary } from "@/services/vocabulary";
import VocabularyCard from "@/components/VocabularyCard";

import type { VocabularyExplanation } from "@/types/vocabulary";

export default function SpeechDemo() {
    const [mode, setMode] =
        useState<ListeningMode>("push-to-talk");

    const [isExplaining, setIsExplaining] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [explanation, setExplanation] =
        useState<VocabularyExplanation | null>(null);

    const [history, setHistory] = useState<
        VocabularyExplanation[]
    >([]);

    const {
        isSupported,
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
    } = useSpeechRecognition();

    const handleExplain = async () => {
        const text = transcript.trim();

        if (!text || isExplaining) return;

        setIsExplaining(true);
        setApiError(null);
        setExplanation(null);

        try {
            const result = await explainVocabulary(text);

            setExplanation(result);

            setHistory((previous) => [
                result,
                ...previous,
            ]);
        } catch (err) {
            setApiError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setIsExplaining(false);
        }
    };

    const speak = (text: string) => {
        if (!("speechSynthesis" in window)) {
            setApiError("Text-to-speech is not supported.");
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;

        window.speechSynthesis.speak(utterance);
    };

    if (!isSupported) {
        return (
            <main className="p-8">
                Speech recognition is not supported by this browser.
            </main>
        );
    }

    const isPushToTalk = mode === "push-to-talk";

    return (
        <main className="mx-auto max-w-2xl space-y-8 p-6">
            <header>
                <h1 className="text-3xl font-bold">VocabAI</h1>
                <p className="mt-1 text-gray-500">
                    Your personal voice-powered dictionary.
                </p>
            </header>

            {/* Listening mode */}
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        stopListening();
                        setMode("push-to-talk");
                    }}
                    className={`rounded-lg px-4 py-2 ${isPushToTalk
                            ? "bg-black text-white"
                            : "bg-gray-100 text-black"
                        }`}
                >
                    Push-to-talk
                </button>

                <button
                    onClick={() => {
                        stopListening();
                        setMode("continuous");
                    }}
                    className={`rounded-lg px-4 py-2 ${!isPushToTalk
                            ? "bg-black text-white"
                            : "bg-gray-100 text-black"
                        }`}
                >
                    Continuous
                </button>
            </div>

            {/* Microphone */}
            <section className="flex flex-col items-center gap-4 rounded-2xl border p-8">
                <div
                    className={`h-3 w-3 rounded-full ${isListening
                            ? "animate-pulse bg-green-500"
                            : "bg-gray-300"
                        }`}
                />

                <p className="text-sm text-gray-500">
                    {isListening ? "Listening..." : "Microphone inactive"}
                </p>

                {isPushToTalk ? (
                    <button
                        type="button"
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(
                                event.pointerId
                            );
                            startListening("push-to-talk");
                        }}
                        onPointerUp={stopListening}
                        onPointerCancel={stopListening}
                        onLostPointerCapture={stopListening}
                        onKeyDown={(event) => {
                            if (
                                (event.key === " " || event.key === "Enter") &&
                                !event.repeat
                            ) {
                                event.preventDefault();
                                startListening("push-to-talk");
                            }
                        }}
                        onKeyUp={(event) => {
                            if (event.key === " " || event.key === "Enter") {
                                stopListening();
                            }
                        }}
                        className="h-24 w-24 touch-none select-none rounded-full bg-blue-600 text-3xl text-white"
                        aria-label="Press and hold to speak"
                    >
                        🎙️
                    </button>
                ) : (
                    <button
                        onClick={() =>
                            isListening
                                ? stopListening()
                                : startListening("continuous")
                        }
                        className="h-24 w-24 rounded-full bg-blue-600 text-3xl text-white"
                    >
                        {isListening ? "⏹" : "🎙️"}
                    </button>
                )}

                <p className="text-center text-sm text-gray-500">
                    {isPushToTalk
                        ? "Press and hold to speak"
                        : "Tap to start or stop listening"}
                </p>
            </section>

            {/* Transcript */}
            <section className="space-y-3">
                <h2 className="font-semibold">Recognized speech</h2>

                <div className="min-h-24 whitespace-pre-wrap rounded-xl bg-gray-100 p-4 text-gray-800">
                    {transcript || "Your transcription will appear here..."}
                </div>

                <button
                    onClick={handleExplain}
                    disabled={!transcript.trim() || isExplaining || isListening}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isExplaining ? "Thinking..." : "Explain with VocabAI"}
                </button>
            </section>

            {/* Errors */}
            {(error || apiError) && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error || apiError}
                </div>
            )}

            {/* AI explanation */}
            {explanation && (
                <VocabularyCard
                    vocabulary={explanation}
                    onSpeak={speak}
                />
            )}

            {/* Session history */}
            {history.length > 0 && (
                <section className="space-y-3">
                    <h2 className="font-semibold">Recent vocabulary</h2>

                    <div className="divide-y rounded-xl border">
                        {history.map((item, index) => (
                            <button
                                key={`${item.term}-${index}`}
                                onClick={() => setExplanation(item)}
                                className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {item.term}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {item.part_of_speech}
                                    </p>
                                </div>

                                <span className="text-gray-400">→</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
