
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
    explainVocabulary,
    getVocabularyHistory,
} from "@/services/vocabulary";
import VocabularyCard from "@/components/VocabularyCard";
import type { VocabularyRecord } from "@/types/vocabulary";

type OrbMode = "idle" | "push-to-talk" | "active" | "processing" | "error";

export default function SpeechDemo() {
    const {
        transcript,
        isListening,
        isSupported,
        startListening,
        stopListening,
        error: speechError,
    } = useSpeechRecognition();

    const [mode, setMode] = useState<OrbMode>("idle");
    const [history, setHistory] = useState<VocabularyRecord[]>([]);
    const [explanation, setExplanation] =
        useState<VocabularyRecord | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const spacePressed = useRef(false);
    const pendingSubmission = useRef(false);
    const activeListening = useRef(false);

    // Load saved vocabulary from PostgreSQL.
    useEffect(() => {
        let cancelled = false;

        async function loadHistory() {
            try {
                const records = await getVocabularyHistory();

                if (!cancelled) {
                    setHistory(records);
                }
            } catch (error) {
                console.error("Unable to load vocabulary history:", error);
            }
        }

        loadHistory();

        return () => {
            cancelled = true;
        };
    }, []);

    // Send recognized speech to FastAPI.
    const handleExplain = useCallback(async (text: string) => {
        const cleanedText = text.trim();

        if (!cleanedText) {
            setMode("idle");
            return;
        }

        setMode("processing");
        setApiError(null);
        setExplanation(null);

        try {
            // The backend generates and saves the vocabulary record.
            const result = await explainVocabulary(cleanedText);

            setExplanation(result);
            setHistory((previous) => [
                result,
                ...previous.filter((item) => item.id !== result.id),
            ]);

            setMode("idle");
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while generating the explanation."
            );
            setMode("error");
        }
    }, []);

    // Submit when speech recognition has stopped.
    useEffect(() => {
        if (!isListening && pendingSubmission.current) {
            pendingSubmission.current = false;
            activeListening.current = false;
            setMode("processing");
            void handleExplain(transcript);
        }
    }, [isListening, transcript, handleExplain]);

    // Spacebar: push-to-talk.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.code !== "Space" ||
                event.repeat ||
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            event.preventDefault();

            if (spacePressed.current || isListening) return;

            spacePressed.current = true;
            pendingSubmission.current = false;
            setApiError(null);
            setExplanation(null);
            setMode("push-to-talk");

            startListening("push-to-talk");
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code !== "Space" || !spacePressed.current) return;

            event.preventDefault();
            spacePressed.current = false;

            if (isListening) {
                pendingSubmission.current = true;
                stopListening();
            }
        };

        const handleBlur = () => {
            if (spacePressed.current) {
                spacePressed.current = false;

                if (isListening) {
                    pendingSubmission.current = true;
                    stopListening();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isListening, startListening, stopListening]);

    // Clicking the orb toggles continuous listening.
    const handleOrbClick = () => {
        if (mode === "processing") return;

        if (activeListening.current && isListening) {
            activeListening.current = false;
            pendingSubmission.current = true;
            stopListening();
            return;
        }

        if (isListening || spacePressed.current) return;

        pendingSubmission.current = false;
        activeListening.current = true;
        setApiError(null);
        setExplanation(null);
        setMode("active");

        startListening("continuous");
    };

    // Keep visual state in sync with speech recognition errors.
    useEffect(() => {
        if (speechError) {
            pendingSubmission.current = false;
            activeListening.current = false;
            spacePressed.current = false;
            setMode("error");
            setApiError(speechError);
        }
    }, [speechError]);

    // Text-to-speech.
    const handleSpeak = (text: string) => {
        if (!("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;

        window.speechSynthesis.speak(utterance);
    };

    const modeText: Record<OrbMode, string> = {
        idle: "Press and hold Space to speak",
        "push-to-talk": "Listening... release Space to finish",
        active: "Active listening · Click to stop",
        processing: "Thinking...",
        error: "Something went wrong",
    };

    const orbClass: Record<OrbMode, string> = {
        idle: "bg-zinc-800 hover:bg-zinc-700 shadow-zinc-900/20",
        "push-to-talk":
            "bg-blue-500 shadow-blue-500/40 scale-110",
        active:
            "bg-violet-500 shadow-violet-500/40 animate-pulse",
        processing:
            "bg-amber-500 shadow-amber-500/40 animate-pulse",
        error: "bg-red-500 shadow-red-500/40",
    };

    if (!isSupported) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
                <p>Speech recognition is not supported by this browser.</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white">
            <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">

                {/* Header */}
                <header className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold tracking-tight">
                        vocab<span className="text-violet-400">ai</span>
                    </h1>

                    <span className="text-xs tracking-widest text-zinc-500 uppercase">
                        Voice vocabulary
                    </span>
                </header>

                {/* Main voice interface */}
                <section className="flex flex-1 flex-col items-center justify-center gap-10 py-16">

                    <div className="text-center">
                        <h2 className="text-3xl font-medium tracking-tight">
                            Your reading companion.
                        </h2>
                        <p className="mt-3 text-sm text-zinc-500">
                            Speak a word. Understand it instantly.
                        </p>
                    </div>

                    {/* Voice orb */}
                    <button
                        type="button"
                        onClick={handleOrbClick}
                        disabled={mode === "processing"}
                        aria-label="Toggle active listening"
                        className={`relative flex h-48 w-48 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/50 disabled:cursor-wait ${orbClass[mode]}`}
                    >
                        <span className="absolute inset-[-12px] rounded-full border border-white/5" />
                        <span className="absolute inset-[-24px] rounded-full border border-white/[0.03]" />

                        {mode === "processing" ? (
                            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-white/90" />
                        )}
                    </button>

                    {/* Status */}
                    <div className="space-y-3 text-center">
                        <p className="text-sm font-medium text-zinc-300">
                            {modeText[mode]}
                        </p>

                        <p className="text-xs text-zinc-600">
                            Click the circle for active listening
                        </p>
                    </div>

                    {/* Live transcript */}
                    {transcript && isListening && (
                        <div className="max-w-lg text-center">
                            <p className="text-lg text-zinc-400">{transcript}</p>
                        </div>
                    )}
                </section>

                {/* Error */}
                {apiError && (
                    <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                        {apiError}
                    </div>
                )}

                {/* Explanation */}
                {explanation && (
                    <section className="mb-10 rounded-2xl border border-white/10 bg-zinc-900 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                                Vocabulary explanation
                            </h3>

                            <button
                                onClick={() =>
                                    handleSpeak(
                                        `${explanation.term}. ${explanation.simple_explanation}`
                                    )
                                }
                                className="text-sm text-violet-400 hover:text-violet-300"
                            >
                                Listen
                            </button>
                        </div>

                        <VocabularyCard
                            vocabulary={explanation}
                            onSpeak={handleSpeak}
                        />
                    </section>
                )}

                {/* Recent vocabulary */}
                <footer className="border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                            YOUR VOCABULARY
                        </span>
                        <span className="text-xs text-zinc-500">
                            {history.length} saved
                        </span>
                    </div>

                    {history.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {history.slice(0, 8).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setExplanation(item)}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-violet-400/50 hover:text-white"
                                >
                                    {item.term}
                                </button>
                            ))}
                        </div>
                    )}
                </footer>
            </div>
        </main>
    );
}
