'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { SpeechRecognitionErrorCode, SpeechRecognitionEvent } from '../../../types/SpeechRecognition';
import type { ChatProps } from './ChatProps';
import { insertDictationChunk } from './insertDictationChunk';
import { learnDictationDictionary } from './learnDictationDictionary';
import {
    normalizeDictationWhitespace,
    refineFinalDictationChunk,
    type DictationRefinementSettings,
} from './refineFinalDictationChunk';
import type { DictationUiState } from './resolveSpeechRecognitionUiDescriptor';
import { useChatInputAreaDictationPersistence } from './useChatInputAreaDictationPersistence';
import { useChatInputAreaDictationSupport } from './useChatInputAreaDictationSupport';

/**
 * Grace timeout after a stop request to prevent a stuck listening state.
 *
 * @private function of `useChatInputAreaDictation`
 */
const STOP_LISTENING_FALLBACK_TIMEOUT_MS = 3000;

/**
 * Captured metadata for one finalized dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationChunk = {
    readonly id: string;
    readonly beforeValue: string;
    readonly finalText: string;
    readonly start: number;
};

/**
 * Stable dictation error shape consumed by the correction panel UI.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationError = {
    readonly code?: SpeechRecognitionErrorCode;
    readonly message: string;
};

/**
 * Props for `useChatInputAreaDictation`.
 *
 * @private function of `<ChatInputArea/>`
 */
type UseChatInputAreaDictationProps = {
    speechRecognition?: ChatProps['speechRecognition'];
    speechRecognitionLanguage?: ChatProps['speechRecognitionLanguage'];
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    messageContentRef: MutableRefObject<string>;
    applyMessageContent: (nextContent: string) => void;
};

/**
 * Replaces the last occurrence of one chunk inside text.
 *
 * @private function of `useChatInputAreaDictation`
 */
function replaceLastOccurrence(text: string, search: string, replacement: string): string {
    if (!search) {
        return text;
    }

    const index = text.lastIndexOf(search);
    if (index < 0) {
        return text;
    }

    return `${text.slice(0, index)}${replacement}${text.slice(index + search.length)}`;
}

/**
 * Creates a stable identifier for one finalized dictation chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function createDictationChunkId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Manages speech-recognition state, transcript refinement, and correction UI.
 *
 * @private function of `<ChatInputArea/>`
 */
export function useChatInputAreaDictation({
    speechRecognition,
    speechRecognitionLanguage,
    textareaRef,
    messageContentRef,
    applyMessageContent,
}: UseChatInputAreaDictationProps) {
    const pendingStopFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replaceSelectionOnNextFinalRef = useRef(false);
    const [dictationUiState, setDictationUiState] = useState<DictationUiState>('idle');
    const [dictationInterimText, setDictationInterimText] = useState('');
    const [dictationError, setDictationError] = useState<DictationError | null>(null);
    const [dictationLastFinalChunk, setDictationLastFinalChunk] = useState('');
    const [dictationEditableChunk, setDictationEditableChunk] = useState('');
    const [dictationChunks, setDictationChunks] = useState<Array<DictationChunk>>([]);
    const [isDictationPanelExpanded, setIsDictationPanelExpanded] = useState(false);
    const {
        dictationSettings,
        setDictationSettings,
        dictationDictionary,
        setDictationDictionary,
    } = useChatInputAreaDictationPersistence();
    const {
        speechRecognitionUiDescriptor,
        resolvedSpeechRecognitionLanguage,
        isBrowserSpeechFallbackSupported,
        microphoneSettingsUrl,
    } = useChatInputAreaDictationSupport({
        dictationUiState,
        speechRecognitionLanguage,
    });

    const clearPendingStopFallback = useCallback(() => {
        if (!pendingStopFallbackRef.current) {
            return;
        }

        clearTimeout(pendingStopFallbackRef.current);
        pendingStopFallbackRef.current = null;
    }, []);

    const focusTextareaSelection = useCallback(
        (selectionStart: number, selectionEnd: number) => {
            requestAnimationFrame(() => {
                const textarea = textareaRef.current;
                if (!textarea) {
                    return;
                }

                textarea.focus();
                textarea.setSelectionRange(selectionStart, selectionEnd);
            });
        },
        [textareaRef],
    );

    const handleDictationFinalResult = useCallback(
        (rawText: string) => {
            const textarea = textareaRef.current;
            if (!textarea) {
                return;
            }

            const previousMessageContent = messageContentRef.current;
            const refinedText = refineFinalDictationChunk(rawText, dictationSettings, dictationDictionary);
            if (!refinedText) {
                return;
            }

            const selectionStart = textarea.selectionStart ?? previousMessageContent.length;
            const selectionEnd = textarea.selectionEnd ?? selectionStart;
            const insertion = insertDictationChunk({
                currentValue: previousMessageContent,
                dictatedText: refinedText,
                selectionStart,
                selectionEnd,
                shouldReplaceSelection: replaceSelectionOnNextFinalRef.current,
            });

            replaceSelectionOnNextFinalRef.current = false;
            setDictationInterimText('');
            setDictationError(null);
            setDictationUiState('listening');
            applyMessageContent(insertion.nextValue);
            setDictationChunks((previousChunks) => [
                ...previousChunks,
                {
                    id: createDictationChunkId(),
                    beforeValue: previousMessageContent,
                    finalText: refinedText,
                    start: insertion.start,
                },
            ]);
            setDictationLastFinalChunk(refinedText);
            setDictationEditableChunk(refinedText);
            setIsDictationPanelExpanded(true);
            focusTextareaSelection(insertion.caret, insertion.caret);
        },
        [
            applyMessageContent,
            dictationDictionary,
            dictationSettings,
            focusTextareaSelection,
            messageContentRef,
            textareaRef,
        ],
    );

    const handleSpeechRecognitionEvent = useCallback(
        (event: SpeechRecognitionEvent) => {
            switch (event.type) {
                case 'START':
                    clearPendingStopFallback();
                    setDictationUiState('listening');
                    setDictationError(null);
                    return;
                case 'TRANSCRIBING':
                    setDictationUiState('processing');
                    return;
                case 'RESULT':
                    if (event.isFinal) {
                        handleDictationFinalResult(event.text);
                    } else {
                        setDictationInterimText(event.text);
                        setIsDictationPanelExpanded(true);
                    }
                    return;
                case 'ERROR':
                    clearPendingStopFallback();
                    setDictationError({
                        code: event.code,
                        message: event.message,
                    });
                    setDictationUiState(event.code === 'permission-denied' ? 'disabled' : 'error');
                    setIsDictationPanelExpanded(true);
                    return;
                case 'STOP':
                    clearPendingStopFallback();
                    setDictationUiState((currentState) => (currentState === 'disabled' ? currentState : 'idle'));
                    setDictationInterimText('');
                    return;
            }
        },
        [clearPendingStopFallback, handleDictationFinalResult],
    );

    useEffect(() => {
        if (!speechRecognition) {
            return;
        }

        const unsubscribe = speechRecognition.subscribe(handleSpeechRecognitionEvent);

        return () => {
            clearPendingStopFallback();
            unsubscribe();
        };
    }, [clearPendingStopFallback, handleSpeechRecognitionEvent, speechRecognition]);

    useEffect(() => {
        return () => {
            clearPendingStopFallback();
            speechRecognition?.$stop();
        };
    }, [clearPendingStopFallback, speechRecognition]);

    const startVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        const textarea = textareaRef.current;
        if (textarea) {
            const selectionStart = textarea.selectionStart ?? 0;
            const selectionEnd = textarea.selectionEnd ?? selectionStart;
            replaceSelectionOnNextFinalRef.current = selectionStart !== selectionEnd;
        }

        setDictationError(null);
        setDictationInterimText('');
        setDictationUiState('listening');
        speechRecognition.$start({
            language: resolvedSpeechRecognitionLanguage,
            interimResults: true,
            whisperMode: dictationSettings.whisperMode,
        });
    }, [dictationSettings.whisperMode, resolvedSpeechRecognitionLanguage, speechRecognition, textareaRef]);

    const stopVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        setDictationUiState('processing');
        speechRecognition.$stop();
        clearPendingStopFallback();
        pendingStopFallbackRef.current = setTimeout(() => {
            setDictationUiState('idle');
            setDictationInterimText('');
        }, STOP_LISTENING_FALLBACK_TIMEOUT_MS);
    }, [clearPendingStopFallback, speechRecognition]);

    const handleToggleVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        if (dictationUiState === 'listening' || dictationUiState === 'processing') {
            stopVoiceInput();
            return;
        }

        startVoiceInput();
    }, [dictationUiState, speechRecognition, startVoiceInput, stopVoiceInput]);

    const handleBacktrackLastChunk = useCallback(() => {
        const previousChunks = [...dictationChunks];
        const lastChunk = previousChunks.pop();

        if (!lastChunk) {
            return;
        }

        setDictationChunks(previousChunks);
        applyMessageContent(lastChunk.beforeValue);

        const previousFinalChunk = previousChunks[previousChunks.length - 1]?.finalText || '';
        setDictationLastFinalChunk(previousFinalChunk);
        setDictationEditableChunk(previousFinalChunk);
        focusTextareaSelection(lastChunk.start, lastChunk.start);
    }, [applyMessageContent, dictationChunks, focusTextareaSelection]);

    const handleApplyCorrection = useCallback(() => {
        const correctedChunk = normalizeDictationWhitespace(dictationEditableChunk);
        const previousChunk = dictationLastFinalChunk;

        if (!correctedChunk || !previousChunk || correctedChunk === previousChunk) {
            return;
        }

        const nextMessageContent = replaceLastOccurrence(messageContentRef.current, previousChunk, correctedChunk);
        applyMessageContent(nextMessageContent);
        setDictationLastFinalChunk(correctedChunk);
        setDictationChunks((previousChunks) => {
            if (previousChunks.length === 0) {
                return previousChunks;
            }

            const nextChunks = [...previousChunks];
            const lastChunk = nextChunks[nextChunks.length - 1];

            if (!lastChunk) {
                return previousChunks;
            }

            nextChunks[nextChunks.length - 1] = {
                ...lastChunk,
                finalText: correctedChunk,
            };

            return nextChunks;
        });
        setDictationDictionary(learnDictationDictionary(previousChunk, correctedChunk, dictationDictionary));
    }, [
        applyMessageContent,
        dictationDictionary,
        dictationEditableChunk,
        dictationLastFinalChunk,
        messageContentRef,
        setDictationDictionary,
    ]);

    const handleRetryPermissionRequest = useCallback(() => {
        setDictationError(null);
        setDictationUiState('idle');
        handleToggleVoiceInput();
    }, [handleToggleVoiceInput]);

    const handleOpenBrowserSettings = useCallback(() => {
        if (!microphoneSettingsUrl) {
            return;
        }

        window.open(microphoneSettingsUrl, '_blank', 'noopener,noreferrer');
    }, [microphoneSettingsUrl]);

    const toggleDictationPanel = useCallback(() => {
        setIsDictationPanelExpanded((value) => !value);
    }, []);

    const expandDictationPanel = useCallback(() => {
        setIsDictationPanelExpanded(true);
    }, []);

    const handleDictationSettingChange = useCallback(
        (settingName: keyof DictationRefinementSettings, checked: boolean) => {
            setDictationSettings((previousSettings) => ({
                ...previousSettings,
                [settingName]: checked,
            }));
        },
        [setDictationSettings],
    );

    const shouldShowDictationPanel = Boolean(
        speechRecognition &&
            (isDictationPanelExpanded ||
                dictationUiState !== 'idle' ||
                Boolean(dictationInterimText) ||
                Boolean(dictationError) ||
                Boolean(dictationLastFinalChunk)),
    );

    return {
        speechRecognitionUiDescriptor,
        shouldShowDictationPanel,
        isDictationPanelExpanded,
        toggleDictationPanel,
        expandDictationPanel,
        dictationInterimText,
        dictationError,
        dictationLastFinalChunk,
        dictationEditableChunk,
        setDictationEditableChunk,
        canBacktrack: dictationChunks.length > 0,
        dictationSettings,
        handleDictationSettingChange,
        handleToggleVoiceInput,
        handleBacktrackLastChunk,
        handleApplyCorrection,
        handleRetryPermissionRequest,
        handleOpenBrowserSettings,
        canOpenBrowserSettings: Boolean(microphoneSettingsUrl),
        isBrowserSpeechFallbackSupported,
    };
}
