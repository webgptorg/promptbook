'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { SpeechRecognitionErrorCode, SpeechRecognitionEvent } from '../../../types/SpeechRecognition';
import type { ChatProps } from './ChatProps';
import { insertDictationChunk } from './insertDictationChunk';
import { learnDictationDictionary } from './learnDictationDictionary';
import {
    type DictationDictionary,
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
 * Successful insertion plan derived from one final speech-recognition result.
 *
 * @private function of `useChatInputAreaDictation`
 */
type FinalDictationInsertion = {
    readonly previousMessageContent: string;
    readonly refinedText: string;
    readonly insertion: ReturnType<typeof insertDictationChunk>;
};

/**
 * Result of undoing the most recent dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationBacktrackResult = {
    readonly removedChunk: DictationChunk;
    readonly nextChunks: Array<DictationChunk>;
    readonly previousFinalChunk: string;
};

/**
 * Data needed to apply a manual correction to the last dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationCorrection = {
    readonly correctedChunk: string;
    readonly previousChunk: string;
    readonly nextMessageContent: string;
    readonly nextChunks: Array<DictationChunk>;
    readonly nextDictionary: DictationDictionary;
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
 * Resolves the current textarea selection for the latest composer value.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveDictationSelection(
    textarea: HTMLTextAreaElement,
    messageContent: string,
): { selectionStart: number; selectionEnd: number } {
    const selectionStart = textarea.selectionStart ?? messageContent.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;

    return {
        selectionStart,
        selectionEnd,
    };
}

/**
 * Returns whether the next final transcript should replace the current selection.
 *
 * @private function of `useChatInputAreaDictation`
 */
function shouldReplaceSelectedTextOnNextFinal(textarea: HTMLTextAreaElement | null): boolean {
    if (!textarea) {
        return false;
    }

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;

    return selectionStart !== selectionEnd;
}

/**
 * Builds the insertion plan for one finalized dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveFinalDictationInsertion(params: {
    readonly rawText: string;
    readonly textarea: HTMLTextAreaElement;
    readonly previousMessageContent: string;
    readonly dictationSettings: DictationRefinementSettings;
    readonly dictationDictionary: DictationDictionary;
    readonly shouldReplaceSelection: boolean;
}): FinalDictationInsertion | null {
    const {
        rawText,
        textarea,
        previousMessageContent,
        dictationSettings,
        dictationDictionary,
        shouldReplaceSelection,
    } = params;
    const refinedText = refineFinalDictationChunk(rawText, dictationSettings, dictationDictionary);
    if (!refinedText) {
        return null;
    }

    const { selectionStart, selectionEnd } = resolveDictationSelection(textarea, previousMessageContent);

    return {
        previousMessageContent,
        refinedText,
        insertion: insertDictationChunk({
            currentValue: previousMessageContent,
            dictatedText: refinedText,
            selectionStart,
            selectionEnd,
            shouldReplaceSelection,
        }),
    };
}

/**
 * Appends one finalized dictated chunk to the stored chunk history.
 *
 * @private function of `useChatInputAreaDictation`
 */
function appendDictationChunk(
    previousChunks: Array<DictationChunk>,
    insertionPlan: FinalDictationInsertion,
): Array<DictationChunk> {
    return [
        ...previousChunks,
        {
            id: createDictationChunkId(),
            beforeValue: insertionPlan.previousMessageContent,
            finalText: insertionPlan.refinedText,
            start: insertionPlan.insertion.start,
        },
    ];
}

/**
 * Removes the last dictated chunk and returns the previous correction state.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveDictationBacktrack(dictationChunks: ReadonlyArray<DictationChunk>): DictationBacktrackResult | null {
    const removedChunk = dictationChunks[dictationChunks.length - 1];
    if (!removedChunk) {
        return null;
    }

    const nextChunks = dictationChunks.slice(0, -1);

    return {
        removedChunk,
        nextChunks,
        previousFinalChunk: nextChunks[nextChunks.length - 1]?.finalText || '',
    };
}

/**
 * Replaces the stored final text of the latest dictated chunk when present.
 *
 * @private function of `useChatInputAreaDictation`
 */
function replaceLastDictationChunk(
    previousChunks: Array<DictationChunk>,
    correctedChunk: string,
): Array<DictationChunk> {
    const lastChunk = previousChunks[previousChunks.length - 1];
    if (!lastChunk) {
        return previousChunks;
    }

    return [
        ...previousChunks.slice(0, -1),
        {
            ...lastChunk,
            finalText: correctedChunk,
        },
    ];
}

/**
 * Resolves the next state when the user manually corrects the last transcript chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveDictationCorrection(params: {
    readonly editableChunk: string;
    readonly previousChunk: string;
    readonly messageContent: string;
    readonly dictationChunks: Array<DictationChunk>;
    readonly dictationDictionary: DictationDictionary;
}): DictationCorrection | null {
    const { editableChunk, previousChunk, messageContent, dictationChunks, dictationDictionary } = params;
    const correctedChunk = normalizeDictationWhitespace(editableChunk);

    if (!correctedChunk || !previousChunk || correctedChunk === previousChunk) {
        return null;
    }

    return {
        correctedChunk,
        previousChunk,
        nextMessageContent: replaceLastOccurrence(messageContent, previousChunk, correctedChunk),
        nextChunks: replaceLastDictationChunk(dictationChunks, correctedChunk),
        nextDictionary: learnDictationDictionary(previousChunk, correctedChunk, dictationDictionary),
    };
}

/**
 * Maps speech-recognition errors to the dictation UI state.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveDictationErrorUiState(errorCode?: SpeechRecognitionErrorCode): DictationUiState {
    return errorCode === 'permission-denied' ? 'disabled' : 'error';
}

/**
 * Returns whether dictation is currently active enough to treat toggle as stop.
 *
 * @private function of `useChatInputAreaDictation`
 */
function isDictationActive(dictationUiState: DictationUiState): boolean {
    return dictationUiState === 'listening' || dictationUiState === 'processing';
}

/**
 * Returns whether the dictation panel should stay visible.
 *
 * @private function of `useChatInputAreaDictation`
 */
function shouldShowDictationPanel(params: {
    readonly hasSpeechRecognition: boolean;
    readonly isDictationPanelExpanded: boolean;
    readonly dictationUiState: DictationUiState;
    readonly dictationInterimText: string;
    readonly dictationError: DictationError | null;
    readonly dictationLastFinalChunk: string;
}): boolean {
    const {
        hasSpeechRecognition,
        isDictationPanelExpanded,
        dictationUiState,
        dictationInterimText,
        dictationError,
        dictationLastFinalChunk,
    } = params;

    return (
        hasSpeechRecognition &&
        (isDictationPanelExpanded ||
            dictationUiState !== 'idle' ||
            Boolean(dictationInterimText) ||
            Boolean(dictationError) ||
            Boolean(dictationLastFinalChunk))
    );
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
    const { dictationSettings, setDictationSettings, dictationDictionary, setDictationDictionary } =
        useChatInputAreaDictationPersistence();
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

    const schedulePendingStopFallback = useCallback(() => {
        clearPendingStopFallback();
        pendingStopFallbackRef.current = setTimeout(() => {
            setDictationUiState('idle');
            setDictationInterimText('');
        }, STOP_LISTENING_FALLBACK_TIMEOUT_MS);
    }, [clearPendingStopFallback]);

    const handleDictationFinalResult = useCallback(
        (rawText: string) => {
            const textarea = textareaRef.current;
            if (!textarea) {
                return;
            }

            const insertionPlan = resolveFinalDictationInsertion({
                rawText,
                textarea,
                previousMessageContent: messageContentRef.current,
                dictationSettings,
                dictationDictionary,
                shouldReplaceSelection: replaceSelectionOnNextFinalRef.current,
            });
            if (!insertionPlan) {
                return;
            }

            replaceSelectionOnNextFinalRef.current = false;
            setDictationInterimText('');
            setDictationError(null);
            setDictationUiState('listening');
            applyMessageContent(insertionPlan.insertion.nextValue);
            setDictationChunks((previousChunks) => appendDictationChunk(previousChunks, insertionPlan));
            setDictationLastFinalChunk(insertionPlan.refinedText);
            setDictationEditableChunk(insertionPlan.refinedText);
            setIsDictationPanelExpanded(true);
            focusTextareaSelection(insertionPlan.insertion.caret, insertionPlan.insertion.caret);
        },
        [
            applyMessageContent,
            dictationDictionary,
            dictationSettings,
            focusTextareaSelection,
            textareaRef,
        ],
    );

    const handleSpeechRecognitionStart = useCallback(() => {
        clearPendingStopFallback();
        setDictationUiState('listening');
        setDictationError(null);
    }, [clearPendingStopFallback]);

    const handleSpeechRecognitionTranscribing = useCallback(() => {
        setDictationUiState('processing');
    }, []);

    const handleSpeechRecognitionInterimResult = useCallback((text: string) => {
        setDictationInterimText(text);
        setIsDictationPanelExpanded(true);
    }, []);

    const handleSpeechRecognitionError = useCallback(
        (event: Extract<SpeechRecognitionEvent, { type: 'ERROR' }>) => {
            clearPendingStopFallback();
            setDictationError({
                code: event.code,
                message: event.message,
            });
            setDictationUiState(resolveDictationErrorUiState(event.code));
            setIsDictationPanelExpanded(true);
        },
        [clearPendingStopFallback],
    );

    const handleSpeechRecognitionStop = useCallback(() => {
        clearPendingStopFallback();
        setDictationUiState((currentState) => (currentState === 'disabled' ? currentState : 'idle'));
        setDictationInterimText('');
    }, [clearPendingStopFallback]);

    const handleSpeechRecognitionEvent = useCallback(
        (event: SpeechRecognitionEvent) => {
            switch (event.type) {
                case 'START':
                    handleSpeechRecognitionStart();
                    return;
                case 'TRANSCRIBING':
                    handleSpeechRecognitionTranscribing();
                    return;
                case 'RESULT':
                    if (event.isFinal) {
                        handleDictationFinalResult(event.text);
                    } else {
                        handleSpeechRecognitionInterimResult(event.text);
                    }
                    return;
                case 'ERROR':
                    handleSpeechRecognitionError(event);
                    return;
                case 'STOP':
                    handleSpeechRecognitionStop();
                    return;
            }
        },
        [
            handleDictationFinalResult,
            handleSpeechRecognitionError,
            handleSpeechRecognitionInterimResult,
            handleSpeechRecognitionStart,
            handleSpeechRecognitionStop,
            handleSpeechRecognitionTranscribing,
        ],
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

        replaceSelectionOnNextFinalRef.current = shouldReplaceSelectedTextOnNextFinal(textareaRef.current);
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
        schedulePendingStopFallback();
    }, [schedulePendingStopFallback, speechRecognition]);

    const handleToggleVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        if (isDictationActive(dictationUiState)) {
            stopVoiceInput();
            return;
        }

        startVoiceInput();
    }, [dictationUiState, speechRecognition, startVoiceInput, stopVoiceInput]);

    const handleBacktrackLastChunk = useCallback(() => {
        const backtrackResult = resolveDictationBacktrack(dictationChunks);
        if (!backtrackResult) {
            return;
        }

        setDictationChunks(backtrackResult.nextChunks);
        applyMessageContent(backtrackResult.removedChunk.beforeValue);
        setDictationLastFinalChunk(backtrackResult.previousFinalChunk);
        setDictationEditableChunk(backtrackResult.previousFinalChunk);
        focusTextareaSelection(backtrackResult.removedChunk.start, backtrackResult.removedChunk.start);
    }, [applyMessageContent, dictationChunks, focusTextareaSelection]);

    const handleApplyCorrection = useCallback(() => {
        const correction = resolveDictationCorrection({
            editableChunk: dictationEditableChunk,
            previousChunk: dictationLastFinalChunk,
            messageContent: messageContentRef.current,
            dictationChunks,
            dictationDictionary,
        });
        if (!correction) {
            return;
        }

        applyMessageContent(correction.nextMessageContent);
        setDictationLastFinalChunk(correction.correctedChunk);
        setDictationChunks(correction.nextChunks);
        setDictationDictionary(correction.nextDictionary);
    }, [
        applyMessageContent,
        dictationChunks,
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

    const isDictationPanelVisible = shouldShowDictationPanel({
        hasSpeechRecognition: Boolean(speechRecognition),
        isDictationPanelExpanded,
        dictationUiState,
        dictationInterimText,
        dictationError,
        dictationLastFinalChunk,
    });

    return {
        speechRecognitionUiDescriptor,
        shouldShowDictationPanel: isDictationPanelVisible,
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
