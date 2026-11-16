
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ListeningMode = "push-to-talk" | "continuous";

interface SpeechRecognitionState {
    isSupported: boolean;
    isListening: boolean;
    transcript: string;
    finalTranscript: string;
    error: string | null;
    startListening: (mode: ListeningMode) => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

export function useSpeechRecognition(): SpeechRecognitionState {
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [finalTranscript, setFinalTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldContinueRef = useRef(false);
    const isListeningRef = useRef(false);
    const finalTranscriptRef = useRef("");
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const modeRef = useRef<ListeningMode>("push-to-talk");

    useEffect(() => {
        const supported =
            "SpeechRecognition" in window ||
            "webkitSpeechRecognition" in window;

        setIsSupported(supported);

        return () => {
            shouldContinueRef.current = false;

            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
            }

            recognitionRef.current?.abort();
        };
    }, []);

    const resetTranscript = useCallback(() => {
        finalTranscriptRef.current = "";
        setTranscript("");
        setFinalTranscript("");
    }, []);

    const stopListening = useCallback(() => {
        shouldContinueRef.current = false;

        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }

        try {
            recognitionRef.current?.stop();
        } catch {
            // Recognition may already have stopped.
        }

        isListeningRef.current = false;
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

        if (isListeningRef.current) return;

        setError(null);
        resetTranscript();

        modeRef.current = mode;
        shouldContinueRef.current = mode === "continuous";

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        recognition.lang = "en-US";
        recognition.continuous = mode === "continuous";
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;

                if (result.isFinal) {
                    finalTranscriptRef.current += text + " ";
                    setFinalTranscript(finalTranscriptRef.current.trim());
                } else {
                    interimTranscript += text;
                }
            }

            setTranscript(
                finalTranscriptRef.current + interimTranscript
            );
        };

        recognition.onerror = (event) => {
            if (
                event.error === "not-allowed" ||
                event.error === "service-not-allowed"
            ) {
                shouldContinueRef.current = false;
                setError("Microphone permission was denied.");
            } else if (
                event.error !== "no-speech" &&
                event.error !== "aborted"
            ) {
                shouldContinueRef.current = false;
                setError(`Speech recognition error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            if (
                modeRef.current === "continuous" &&
                shouldContinueRef.current
            ) {
                restartTimerRef.current = setTimeout(() => {
                    if (!shouldContinueRef.current) return;

                    try {
                        recognition.start();
                    } catch {
                        shouldContinueRef.current = false;
                        isListeningRef.current = false;
                        setIsListening(false);
                        setError("Unable to restart speech recognition.");
                    }
                }, 300);

                return;
            }

            isListeningRef.current = false;
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch {
            shouldContinueRef.current = false;
            isListeningRef.current = false;
            setIsListening(false);
            setError("Unable to start speech recognition.");
        }
    }, [resetTranscript]);

    return {
        transcript,
        finalTranscript,
        isListening,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        error,
    };
}
