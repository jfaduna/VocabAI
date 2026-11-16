
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ListeningMode = "push-to-talk" | "continuous";

interface SpeechRecognitionState {
    isSupported: boolean;
    isListening: boolean;
    transcript: string;
    error: string | null;
    startListening: (mode: ListeningMode) => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

export function useSpeechRecognition(): SpeechRecognitionState {
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldContinueRef = useRef(false);
    const finalTranscriptRef = useRef("");
    const modeRef = useRef<ListeningMode>("push-to-talk");

    useEffect(() => {
        const supported =
            "SpeechRecognition" in window ||
            "webkitSpeechRecognition" in window;

        setIsSupported(supported);

        return () => {
            shouldContinueRef.current = false;
            recognitionRef.current?.abort();
        };
    }, []);

    const stopListening = useCallback(() => {
        shouldContinueRef.current = false;

        try {
            recognitionRef.current?.stop();
        } catch {
            // Recognition may already have stopped.
        }

        setIsListening(false);
    }, []);

    const startListening = useCallback((mode: ListeningMode) => {
        const SpeechRecognitionAPI =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            setError("Speech recognition is not supported by this browser.");
            return;
        }

        if (isListening) return;

        setError(null);
        setTranscript("");
        finalTranscriptRef.current = "";
        modeRef.current = mode;
        shouldContinueRef.current = mode === "continuous";

        const recognition = new SpeechRecognitionAPI();

        recognitionRef.current = recognition;

        recognition.lang = "en-US";
        recognition.continuous = mode === "continuous";
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const result = event.results[i];
                const text = result[0].transcript;

                if (result.isFinal) {
                    finalTranscriptRef.current += text + " ";
                } else {
                    interimTranscript += text;
                }
            }

            setTranscript(
                finalTranscriptRef.current + interimTranscript
            );
        };

        recognition.onerror = (event) => {
            if (event.error === "not-allowed" ||
                event.error === "service-not-allowed") {
                shouldContinueRef.current = false;
                setError("Microphone permission was denied.");
            } else if (event.error === "no-speech") {
                // No speech detected. Continuous mode can restart.
            } else if (event.error !== "aborted") {
                setError(`Speech recognition error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            if (
                modeRef.current === "continuous" &&
                shouldContinueRef.current
            ) {
                // Restart after the browser ends a recognition session.
                window.setTimeout(() => {
                    if (!shouldContinueRef.current) return;

                    try {
                        recognition.start();
                    } catch {
                        setIsListening(false);
                        shouldContinueRef.current = false;
                        setError("Unable to restart speech recognition.");
                    }
                }, 300);

                return;
            }

            setIsListening(false);
        };

        try {
            recognition.start();
        } catch {
            shouldContinueRef.current = false;
            setIsListening(false);
            setError("Unable to start speech recognition.");
        }
    }, [isListening]);

    const resetTranscript = () => {
        setTranscript("");
    };

    return {
        transcript,
        isListening,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        error,
    };
}
