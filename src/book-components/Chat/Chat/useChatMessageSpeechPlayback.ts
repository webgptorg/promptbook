'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { attachClientVersionHeader } from '../../../utils/clientVersion';

/**
 * Maximum characters allowed in a single ElevenLabs speech request.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const MAX_MESSAGE_SPEECH_LENGTH = 4500;

/**
 * Fallback error shown when there is no text suitable for speech playback.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const NOTHING_TO_READ_ALOUD_ERROR = 'Nothing to read aloud.';

/**
 * Inputs needed to manage speech playback for one chat message.
 *
 * @private internal hook of `<ChatMessageItem/>`
 */
export type UseChatMessageSpeechPlaybackOptions = {
    readonly trimmedMessageContent: string;
    readonly contentRef: RefObject<HTMLElement | null>;
    readonly shouldShowPlayButton: boolean;
    readonly elevenLabsVoiceId?: string;
};

/**
 * Speech playback state and actions returned to `<ChatMessageItem/>`.
 *
 * @private internal hook of `<ChatMessageItem/>`
 */
export type UseChatMessageSpeechPlaybackResult = {
    readonly audioError: string | null;
    readonly isAudioLoading: boolean;
    readonly isAudioPlaying: boolean;
    readonly handlePlayMessage: () => Promise<void>;
};

/**
 * Handles ElevenLabs speech playback, caching, and audio element lifecycle for one message.
 *
 * @private internal hook of `<ChatMessageItem/>`
 */
export function useChatMessageSpeechPlayback(
    options: UseChatMessageSpeechPlaybackOptions,
): UseChatMessageSpeechPlaybackResult {
    const { trimmedMessageContent, contentRef, shouldShowPlayButton, elevenLabsVoiceId } = options;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);

    const attachMessageAudioListeners = useCallback((element: HTMLAudioElement) => {
        element.onplay = () => {
            setIsAudioPlaying(true);
        };
        element.onpause = () => {
            setIsAudioPlaying(false);
        };
        element.onended = () => {
            setIsAudioPlaying(false);
            element.currentTime = 0;
        };
    }, []);

    const getMessageTextForSpeech = useCallback(() => {
        const renderedText = contentRef.current?.innerText?.trim();
        if (renderedText) {
            return renderedText;
        }

        return trimmedMessageContent;
    }, [contentRef, trimmedMessageContent]);

    const handlePlayMessage = useCallback(async () => {
        if (isAudioLoading) {
            return;
        }

        if (!shouldShowPlayButton) {
            setAudioError(NOTHING_TO_READ_ALOUD_ERROR);
            return;
        }

        const speechText = getMessageTextForSpeech();
        if (!speechText) {
            setAudioError(NOTHING_TO_READ_ALOUD_ERROR);
            return;
        }

        const payloadText =
            speechText.length > MAX_MESSAGE_SPEECH_LENGTH
                ? speechText.slice(0, MAX_MESSAGE_SPEECH_LENGTH).trim()
                : speechText;

        if (!payloadText) {
            setAudioError(NOTHING_TO_READ_ALOUD_ERROR);
            return;
        }

        setAudioError(null);

        const playAudio = async (element: HTMLAudioElement) => {
            try {
                await element.play();
            } catch (playError) {
                setAudioError(playError instanceof Error ? playError.message : 'Browser blocked audio playback.');
            }
        };

        if (audioUrl) {
            const audio = audioRef.current ?? new Audio(audioUrl);
            audioRef.current = audio;
            attachMessageAudioListeners(audio);

            if (audio.paused) {
                await playAudio(audio);
            } else {
                audio.pause();
            }

            return;
        }

        setIsAudioLoading(true);
        try {
            const response = await fetch('/api/elevenlabs/tts', {
                method: 'POST',
                headers: attachClientVersionHeader({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({ text: payloadText, voiceId: elevenLabsVoiceId }),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(body || 'Unable to request speech audio.');
            }

            const buffer = await response.arrayBuffer();
            const blob = new Blob([buffer], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            attachMessageAudioListeners(audio);

            setAudioUrl((previousUrl) => {
                if (previousUrl) {
                    URL.revokeObjectURL(previousUrl);
                }

                return url;
            });

            await playAudio(audio);
        } catch (error) {
            setAudioError(error instanceof Error ? error.message : 'Failed to generate speech.');
        } finally {
            setIsAudioLoading(false);
        }
    }, [
        attachMessageAudioListeners,
        audioUrl,
        elevenLabsVoiceId,
        getMessageTextForSpeech,
        isAudioLoading,
        shouldShowPlayButton,
    ]);

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    return {
        audioError,
        isAudioLoading,
        isAudioPlaying,
        handlePlayMessage,
    };
}
