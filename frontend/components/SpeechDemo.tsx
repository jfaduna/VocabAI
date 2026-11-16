
"use client";

import { useState } from "react";
import {
    useSpeechRecognition,
    type ListeningMode,
} from "@/hooks/useSpeechRecognition";

export default function SpeechDemo() {
    const [mode, setMode] =
        useState<ListeningMode>("push-to-talk");

    const {
        isSupported,
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
    } = useSpeechRecognition();

    if (!isSupported) {
        return (
            <div className="rounded-xl border p-6">
                Speech recognition is not supported
                by this browser.
            </div>
        );
    }

    const isPushToTalk = mode === "push-to-talk";

    return (
        <main className="mx-auto max-w-xl space-y-6 p-6">

            <header>
                <h1 className="text-3xl font-bold">
                    VocabAI
                </h1>
                <p className="text-gray-500">
                    Your personal voice-powered dictionary.
                </p>
            </header>

            {/* Listening mode selector */}
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

            {/* Microphone control */}
            <div className="flex flex-col items-center gap-4 rounded-2xl border p-8">

                <div
                    className={`h-4 w-4 rounded-full ${isListening ? "bg-green-500 animate-pulse" :
                            "bg-gray-300"
                        }`}
                />

                <p className="text-sm text-gray-500">
                    {isListening
                        ? "Listening..."
                        : "Microphone inactive"}
                </p>

                {isPushToTalk ? (
                    <button
                        type="button"
                        onPointerDown={() =>
                            startListening("push-to-talk")
                        }
                        onPointerUp={stopListening}
                        onPointerLeave={stopListening}
                        onPointerCancel={stopListening}
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
                            if (
                                event.key === " " ||
                                event.key === "Enter"
                            ) {
                                stopListening();
                            }
                        }}
                        className="h-24 w-24 rounded-full bg-blue-600 text-white text-3xl select-none touch-none"
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
                        className="h-24 w-24 rounded-full bg-blue-600 text-white text-3xl"
                    >
                        {isListening ? "⏹" : "🎙️"}
                    </button>
                )}

                <p className="text-sm text-gray-500 text-center">
                    {isPushToTalk
                        ? "Press and hold to speak"
                        : "Tap to start or stop listening"}
                </p>
            </div>

            {/* Recognized speech */}
            <section className="space-y-3">
                <h2 className="font-semibold">
                    Recognized speech
                </h2>

                <div className="min-h-32 rounded-xl bg-gray-100 p-4 text-gray-800">
                    {transcript || "Your transcription will appear here..."}
                </div>
            </section>

            {/* Errors */}
            {error && (
                <div className="rounded-lg bg-red-100 p-3 text-red-700">
                    {error}
                </div>
            )}

            <button
                onClick={() => navigator.clipboard.writeText(transcript)}
                disabled={!transcript}
                className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
                Copy transcription
            </button>

        </main>
    );
}
