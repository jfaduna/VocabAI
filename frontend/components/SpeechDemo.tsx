
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
    explainVocabulary,
    getVocabularyHistory,
} from "@/services/vocabulary";
import VocabularyCard from "@/components/VocabularyCard";
import type { VocabularyRecord } from "@/types/vocabulary";

type OrbMode =
    | "idle"
    | "push-to-talk"
    | "active"
    | "processing"
    | "error";

const SILENCE_DELAY = 1600;

export default function SpeechDemo() {
    const {
        transcript,
        finalTranscript,
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
    const [search, setSearch] = useState("");

    const spacePressed = useRef(false);
    const pendingSubmission = useRef(false);
    const activeListening = useRef(false);
    const submissionLock = useRef(false);
    const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearSilenceTimer = useCallback(() => {
        if (silenceTimer.current) {
            clearTimeout(silenceTimer.current);
            silenceTimer.current = null;
        }
    }, []);

    // Load saved vocabulary.
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

        void loadHistory();

        return () => {
            cancelled = true;
        };
    }, []);

    // Submit a question to the backend.
    const handleExplain = useCallback(async (text: string) => {
        const cleanedText = text.trim();

        if (!cleanedText || submissionLock.current) {
            if (!cleanedText) setMode("idle");
            return;
        }

        submissionLock.current = true;
        clearSilenceTimer();
        setMode("processing");
        setApiError(null);

        try {
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
                    : "Unable to generate the explanation."
            );
            setMode("error");
        } finally {
            submissionLock.current = false;
        }
    }, [clearSilenceTimer]);

    // Active listening: submit after confirmed speech is followed by silence.
    useEffect(() => {
        if (
            !activeListening.current ||
            !isListening ||
            !finalTranscript.trim()
        ) {
            return;
        }

        clearSilenceTimer();

        silenceTimer.current = setTimeout(() => {
            const question = finalTranscript.trim();

            activeListening.current = false;
            pendingSubmission.current = false;

            stopListening();
            void handleExplain(question);
        }, SILENCE_DELAY);

        return clearSilenceTimer;
    }, [
        finalTranscript,
        isListening,
        stopListening,
        handleExplain,
        clearSilenceTimer,
    ]);

    // Push-to-talk: submit when Space is released.
    useEffect(() => {
        if (isListening || !pendingSubmission.current) return;

        pendingSubmission.current = false;
        void handleExplain(finalTranscript || transcript);
    }, [isListening, finalTranscript, transcript, handleExplain]);

    // Spacebar controls push-to-talk.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.code !== "Space" ||
                event.repeat ||
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                (event.target instanceof HTMLElement &&
                    event.target.isContentEditable)
            ) {
                return;
            }

            event.preventDefault();

            if (
                spacePressed.current ||
                isListening ||
                mode === "processing"
            ) {
                return;
            }

            spacePressed.current = true;
            pendingSubmission.current = false;
            activeListening.current = false;
            clearSilenceTimer();

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
            if (!spacePressed.current) return;

            spacePressed.current = false;

            if (isListening) {
                pendingSubmission.current = true;
                stopListening();
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
    }, [
        isListening,
        mode,
        startListening,
        stopListening,
        clearSilenceTimer,
    ]);

    // Start or stop active listening.
    const handleOrbClick = () => {
        if (mode === "processing" || spacePressed.current) return;

        if (activeListening.current) {
            activeListening.current = false;
            clearSilenceTimer();

            pendingSubmission.current = true;
            stopListening();
            return;
        }

        if (isListening) return;

        pendingSubmission.current = false;
        activeListening.current = true;

        setApiError(null);
        setExplanation(null);
        setMode("active");

        startListening("continuous");
    };

    // Speech recognition errors.
    useEffect(() => {
        if (!speechError) return;

        activeListening.current = false;
        pendingSubmission.current = false;
        spacePressed.current = false;
        clearSilenceTimer();

        setMode("error");
        setApiError(speechError);
    }, [speechError, clearSilenceTimer]);

    // Text-to-speech.
    const handleSpeak = (text: string) => {
        if (!("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;

        window.speechSynthesis.speak(utterance);
    };

    const filteredHistory = history.filter((item) =>
        item.term.toLowerCase().includes(search.toLowerCase())
    );

    const modeText: Record<OrbMode, string> = {
        idle: "Ready when you are",
        "push-to-talk": "Listening · Release Space to finish",
        active: "Listening · Pause to submit automatically",
        processing: "Generating your explanation...",
        error: "Something went wrong",
    };

    const orbClass: Record<OrbMode, string> = {
        idle: "bg-zinc-800 hover:bg-zinc-700",
        "push-to-talk": "bg-blue-500 shadow-blue-500/30 scale-105",
        active: "bg-violet-500 shadow-violet-500/40 animate-pulse",
        processing: "bg-amber-500 shadow-amber-500/30 animate-pulse",
        error: "bg-red-500 shadow-red-500/30",
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
            <header className="flex h-16 items-center justify-between border-b border-white/10 px-6 lg:px-8">
                <h1 className="text-xl font-semibold tracking-tight">
                    vocab<span className="text-violet-400">ai</span>
                </h1>

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className={`h-2 w-2 rounded-full ${mode === "active" ? "bg-violet-400" :
                        mode === "processing" ? "bg-amber-400" :
                            "bg-zinc-600"
                        }`} />
                    {mode === "active" ? "ACTIVE LISTENING" : "VOICE VOCABULARY"}
                </div>
            </header>

            <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[260px_minmax(320px,1fr)_minmax(360px,1.1fr)]">

                {/* LEFT: Vocabulary history */}
                <aside className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xs font-semibold tracking-widest text-zinc-400">
                            VOCABULARY HISTORY
                        </h2>
                        <span className="text-xs text-zinc-600">
                            {history.length}
                        </span>
                    </div>

                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search vocabulary..."
                        className="mb-4 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/60"
                    />

                    <div className="space-y-1 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
                        {filteredHistory.length === 0 ? (
                            <p className="py-8 text-center text-sm text-zinc-600">
                                {search
                                    ? "No matching words."
                                    : "Your saved words will appear here."}
                            </p>
                        ) : (
                            filteredHistory.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setExplanation(item);
                                        setApiError(null);
                                    }}
                                    className={`w-full rounded-xl px-3 py-3 text-left transition ${explanation?.id === item.id
                                        ? "border border-violet-500/20 bg-violet-500/10"
                                        : "border border-transparent hover:bg-white/5"
                                        }`}
                                >
                                    <span className="block text-sm font-medium text-zinc-200">
                                        {item.term}
                                    </span>
                                    <span className="mt-1 block truncate text-xs text-zinc-500">
                                        {item.simple_explanation}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* CENTER: Voice interface */}
                <section className="flex min-h-[520px] flex-col items-center justify-center border-b border-white/10 px-6 py-12 text-center lg:border-b-0 lg:px-8">
                    <div className="mb-12">
                        <h2 className="text-3xl font-medium tracking-tight">
                            Your reading companion.
                        </h2>
                        <p className="mt-3 text-sm text-zinc-500">
                            Speak a word or ask a question about it.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOrbClick}
                        disabled={mode === "processing"}
                        aria-label={
                            activeListening.current
                                ? "Stop active listening"
                                : "Start active listening"
                        }
                        className={`relative flex h-44 w-44 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/50 disabled:cursor-wait ${orbClass[mode]}`}
                    >
                        <span className="absolute inset-[-14px] rounded-full border border-white/5" />
                        <span className="absolute inset-[-28px] rounded-full border border-white/[0.03]" />

                        {mode === "processing" ? (
                            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-white/90" />
                        )}
                    </button>

                    <div className="mt-12 space-y-3">
                        <p className="text-sm font-medium text-zinc-300">
                            {modeText[mode]}
                        </p>

                        <p className="text-xs text-zinc-600">
                            Click the circle to toggle active listening
                        </p>
                        <p className="text-xs text-zinc-600">
                            Or hold <kbd className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-zinc-400">SPACE</kbd> to speak
                        </p>
                    </div>

                    <div className="mt-10 min-h-16 max-w-lg">
                        {transcript ? (
                            <p className="text-base leading-relaxed text-zinc-400">
                                {transcript}
                            </p>
                        ) : (
                            <p className="text-sm text-zinc-700">
                                Your speech will appear here...
                            </p>
                        )}
                    </div>
                </section>

                {/* RIGHT: Explanation */}
                <aside className="p-5 lg:border-l lg:border-white/10 lg:p-8">
                    <div className="mb-6">
                        <h2 className="text-xs font-semibold tracking-widest text-zinc-400">
                            EXPLANATION
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Your vocabulary breakdown appears here.
                        </p>
                    </div>

                    {apiError && (
                        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                            {apiError}
                        </div>
                    )}

                    {mode === "processing" && (
                        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
                            <div className="flex items-center gap-3 text-sm text-zinc-400">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
                                Understanding your question...
                            </div>
                        </div>
                    )}

                    {explanation && mode !== "processing" && (
                        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                                    Vocabulary breakdown
                                </span>

                                <button
                                    onClick={() =>
                                        handleSpeak(
                                            `${explanation.term}. ${explanation.simple_explanation}`
                                        )
                                    }
                                    className="rounded-lg px-3 py-1.5 text-sm text-violet-400 transition hover:bg-violet-500/10 hover:text-violet-300"
                                >
                                    Listen
                                </button>
                            </div>

                            <VocabularyCard
                                vocabulary={explanation}
                                onSpeak={handleSpeak}
                            />
                        </div>
                    )}

                    {!explanation && mode !== "processing" && !apiError && (
                        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
                                <span className="text-xl text-zinc-500">Aa</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-400">
                                Nothing to explain yet
                            </p>
                            <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-600">
                                Start listening and ask about an unfamiliar word.
                                Your explanation will show up here.
                            </p>
                        </div>
                    )}
                </aside>
            </div>
        </main>
    );
}
