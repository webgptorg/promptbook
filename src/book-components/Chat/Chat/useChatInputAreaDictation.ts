'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from 'react';
import type { SpeechRecognitionErrorCode, SpeechRecognitionEvent } from '../../../types/SpeechRecognition';
import type { ChatProps } from './ChatProps';
import { insertDictationChunk } from './insertDictationChunk';
import { learnDictationDictionary } from './learnDictationDictionary';
import type { DictationRefinementSettings } from './refineFinalDictationChunk';
import { normalizeDictationWhitespace, refineFinalDictationChunk } from './refineFinalDictationChunk';
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
 * Stable insertion range captured when the user starts dictation.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationInsertionSelection = {
    readonly selectionStart: number;
    readonly selectionEnd: number;
    readonly isReplacingSelection: boolean;
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
 * Shared dictation UI state and setters used by focused internal helpers.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationState = {
    readonly dictationUiState: DictationUiState;
    readonly setDictationUiState: Dispatch<SetStateAction<DictationUiState>>;
    readonly setDictationInterimText: Dispatch<SetStateAction<string>>;
    readonly setDictationError: Dispatch<SetStateAction<DictationError | null>>;
    readonly setDictationLastFinalChunk: Dispatch<SetStateAction<string>>;
    readonly setDictationEditableChunk: Dispatch<SetStateAction<string>>;
    readonly setDictationChunks: Dispatch<SetStateAction<Array<DictationChunk>>>;
    readonly setIsDictationPanelExpanded: Dispatch<SetStateAction<boolean>>;
};

/**
 * Props for final transcript insertion handling.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationFinalResultHandlerProps = {
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    readonly messageContentRef: MutableRefObject<string>;
    readonly applyMessageContent: (nextContent: string) => void;
    readonly dictationSettings: DictationRefinementSettings;
    readonly dictationDictionary: ReturnType<typeof useChatInputAreaDictationPersistence>['dictationDictionary'];
    readonly dictationInsertionSelectionRef: MutableRefObject<DictationInsertionSelection | null>;
    readonly focusTextareaSelection: (selectionStart: number, selectionEnd: number) => void;
    readonly state: UseChatInputAreaDictationState;
};

/**
 * Props for speech-recognition event handling.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationSpeechRecognitionEventHandlerProps = {
    readonly clearPendingStopFallback: () => void;
    readonly handleDictationFinalResult: (rawText: string) => void;
    readonly state: UseChatInputAreaDictationState;
};

/**
 * Props for speech-recognition subscription lifecycle handling.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationSpeechRecognitionLifecycleProps = {
    readonly speechRecognition?: ChatProps['speechRecognition'];
    readonly clearPendingStopFallback: () => void;
    readonly handleSpeechRecognitionEvent: (event: SpeechRecognitionEvent) => void;
};

/**
 * Props for start/stop/toggle dictation controls.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationVoiceInputControlsProps = {
    readonly speechRecognition?: ChatProps['speechRecognition'];
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    readonly resolvedSpeechRecognitionLanguage: string;
    readonly whisperMode: boolean;
    readonly pendingStopFallbackRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    readonly dictationInsertionSelectionRef: MutableRefObject<DictationInsertionSelection | null>;
    readonly clearPendingStopFallback: () => void;
    readonly state: Pick<
        UseChatInputAreaDictationState,
        'dictationUiState' | 'setDictationUiState' | 'setDictationInterimText' | 'setDictationError'
    >;
};

/**
 * Props for correction and backtracking controls.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationCorrectionHandlersProps = {
    readonly dictationChunks: ReadonlyArray<DictationChunk>;
    readonly dictationLastFinalChunk: string;
    readonly dictationEditableChunk: string;
    readonly dictationDictionary: ReturnType<typeof useChatInputAreaDictationPersistence>['dictationDictionary'];
    readonly dictationInsertionSelectionRef: MutableRefObject<DictationInsertionSelection | null>;
    readonly messageContentRef: MutableRefObject<string>;
    readonly applyMessageContent: (nextContent: string) => void;
    readonly focusTextareaSelection: (selectionStart: number, selectionEnd: number) => void;
    readonly setDictationChunks: Dispatch<SetStateAction<Array<DictationChunk>>>;
    readonly setDictationLastFinalChunk: Dispatch<SetStateAction<string>>;
    readonly setDictationEditableChunk: Dispatch<SetStateAction<string>>;
    readonly setDictationDictionary: ReturnType<typeof useChatInputAreaDictationPersistence>['setDictationDictionary'];
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
 * Resolves the current textarea selection with a stable fallback to the message length.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveTextareaSelection(
    textareaElement: HTMLTextAreaElement,
    fallbackLength: number,
): { selectionStart: number; selectionEnd: number } {
    const selectionStart = textareaElement.selectionStart ?? fallbackLength;
    const selectionEnd = textareaElement.selectionEnd ?? selectionStart;

    return {
        selectionStart,
        selectionEnd,
    };
}

/**
 * Creates the persisted metadata entry for one finalized dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function createFinalizedDictationChunk(params: {
    readonly beforeValue: string;
    readonly finalText: string;
    readonly start: number;
}): DictationChunk {
    const { beforeValue, finalText, start } = params;

    return {
        id: createDictationChunkId(),
        beforeValue,
        finalText,
        start,
    };
}

/**
 * Clears the pending stop fallback timeout when one exists.
 *
 * @private function of `useChatInputAreaDictation`
 */
function clearPendingStopFallbackTimeout(
    pendingStopFallbackRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
    if (!pendingStopFallbackRef.current) {
        return;
    }

    clearTimeout(pendingStopFallbackRef.current);
    pendingStopFallbackRef.current = null;
}

/**
 * Captures where the next finalized chunk should be inserted.
 *
 * @private function of `useChatInputAreaDictation`
 */
function captureDictationInsertionSelection(
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>,
    dictationInsertionSelectionRef: MutableRefObject<DictationInsertionSelection | null>,
): void {
    const textarea = textareaRef.current;
    if (!textarea) {
        return;
    }

    const { selectionStart, selectionEnd } = resolveTextareaSelection(textarea, textarea.value.length);
    dictationInsertionSelectionRef.current = {
        selectionStart,
        selectionEnd,
        isReplacingSelection: selectionStart !== selectionEnd,
    };
}

/**
 * Resolves the insertion range for one finalized dictation chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveDictationInsertionSelection(
    textareaElement: HTMLTextAreaElement,
    messageContentLength: number,
    dictationInsertionSelection: DictationInsertionSelection | null,
): DictationInsertionSelection {
    if (dictationInsertionSelection) {
        return dictationInsertionSelection;
    }

    const { selectionStart, selectionEnd } = resolveTextareaSelection(textareaElement, messageContentLength);

    return {
        selectionStart,
        selectionEnd,
        isReplacingSelection: selectionStart !== selectionEnd,
    };
}

/**
 * Removes one tracked dictated chunk from the current composer value.
 *
 * @private function of `useChatInputAreaDictation`
 */
function removeTrackedDictationChunk(currentValue: string, chunk: DictationChunk): string {
    const trackedText = currentValue.slice(chunk.start, chunk.start + chunk.finalText.length);

    if (trackedText === chunk.finalText) {
        return `${currentValue.slice(0, chunk.start)}${currentValue.slice(chunk.start + chunk.finalText.length)}`;
    }

    return replaceLastOccurrence(currentValue, chunk.finalText, '');
}

/**
 * Replaces one tracked dictated chunk inside the current composer value.
 *
 * @private function of `useChatInputAreaDictation`
 */
function replaceTrackedDictationChunk(currentValue: string, chunk: DictationChunk, correctedChunk: string): string {
    const trackedText = currentValue.slice(chunk.start, chunk.start + chunk.finalText.length);

    if (trackedText === chunk.finalText) {
        return `${currentValue.slice(0, chunk.start)}${correctedChunk}${currentValue.slice(
            chunk.start + chunk.finalText.length,
        )}`;
    }

    return replaceLastOccurrence(currentValue, chunk.finalText, correctedChunk);
}

/**
 * Stores the next append position after a programmatic dictation edit.
 *
 * @private function of `useChatInputAreaDictation`
 */
function updateDictationInsertionCaret(
    dictationInsertionSelectionRef: MutableRefObject<DictationInsertionSelection | null>,
    caret: number,
): void {
    dictationInsertionSelectionRef.current = {
        selectionStart: caret,
        selectionEnd: caret,
        isReplacingSelection: false,
    };
}

/**
 * Produces the corrected chunk value only when a real correction should be applied.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveCorrectedDictationChunk(
    dictationEditableChunk: string,
    dictationLastFinalChunk: string,
): string | null {
    const correctedChunk = normalizeDictationWhitespace(dictationEditableChunk);

    if (!correctedChunk || !dictationLastFinalChunk || correctedChunk === dictationLastFinalChunk) {
        return null;
    }

    return correctedChunk;
}

/**
 * Replaces the last tracked chunk text inside the tracked chunk list.
 *
 * @private function of `useChatInputAreaDictation`
 */
function replaceLastDictationChunk(
    previousChunks: Array<DictationChunk>,
    correctedChunk: string,
): Array<DictationChunk> {
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
}

/**
 * Opens browser microphone settings in a new tab when a settings URL is available.
 *
 * @private function of `useChatInputAreaDictation`
 */
function openBrowserSettings(microphoneSettingsUrl?: string): void {
    if (!microphoneSettingsUrl) {
        return;
    }

    window.open(microphoneSettingsUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Resolves whether the dictation panel should be visible for the current state snapshot.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveShouldShowDictationPanel(params: {
    readonly speechRecognition?: ChatProps['speechRecognition'];
    readonly isDictationPanelExpanded: boolean;
    readonly dictationUiState: DictationUiState;
    readonly dictationInterimText: string;
    readonly dictationError: DictationError | null;
    readonly dictationLastFinalChunk: string;
}): boolean {
    const {
        speechRecognition,
        isDictationPanelExpanded,
        dictationUiState,
        dictationInterimText,
        dictationError,
        dictationLastFinalChunk,
    } = params;

    return Boolean(
        speechRecognition &&
            (isDictationPanelExpanded ||
                dictationUiState !== 'idle' ||
                Boolean(dictationInterimText) ||
                Boolean(dictationError) ||
                Boolean(dictationLastFinalChunk)),
    );
}

/**
 * Focuses the textarea and restores a given selection range after programmatic edits.
 *
 * @private function of `useChatInputAreaDictation`
 */
function useTextareaSelectionFocus(textareaRef: MutableRefObject<HTMLTextAreaElement | null>) {
    return useCallback(
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
}

/**
 * Builds the final-result handler that refines text, inserts it, and exposes it for correction.
 *
 * @private function of `useChatInputAreaDictation`
 */
function useChatInputAreaDictationFinalResultHandler({
    textareaRef,
    messageContentRef,
    applyMessageContent,
    dictationSettings,
    dictationDictionary,
    dictationInsertionSelectionRef,
    focusTextareaSelection,
    state,
}: UseChatInputAreaDictationFinalResultHandlerProps) {
    const {
        setDictationUiState,
        setDictationInterimText,
        setDictationError,
        setDictationLastFinalChunk,
        setDictationEditableChunk,
        setDictationChunks,
        setIsDictationPanelExpanded,
    } = state;

    return useCallback(
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

            const { selectionStart, selectionEnd, isReplacingSelection } = resolveDictationInsertionSelection(
                textarea,
                previousMessageContent.length,
                dictationInsertionSelectionRef.current,
            );
            const insertion = insertDictationChunk({
                currentValue: previousMessageContent,
                dictatedText: refinedText,
                selectionStart,
                selectionEnd,
                isReplacingSelection,
            });

            updateDictationInsertionCaret(dictationInsertionSelectionRef, insertion.caret);
            setDictationInterimText('');
            setDictationError(null);
            setDictationUiState('listening');
            applyMessageContent(insertion.nextValue);
            setDictationChunks((previousChunks) => [
                ...previousChunks,
                createFinalizedDictationChunk({
                    beforeValue: previousMessageContent,
                    finalText: refinedText,
                    start: insertion.start,
                }),
            ]);
            setDictationLastFinalChunk(refinedText);
            setDictationEditableChunk(refinedText);
            setIsDictationPanelExpanded(true);
            focusTextareaSelection(insertion.caret, insertion.caret);
        },
        [
            applyMessageContent,
            dictationDictionary,
            dictationInsertionSelectionRef,
            dictationSettings,
            focusTextareaSelection,
            messageContentRef,
            setDictationChunks,
            setDictationEditableChunk,
            setDictationError,
            setDictationInterimText,
            setDictationLastFinalChunk,
            setDictationUiState,
            setIsDictationPanelExpanded,
            textareaRef,
        ],
    );
}

/**
 * Builds the event handler that translates speech-recognition events into dictation UI updates.
 *
 * @private function of `useChatInputAreaDictation`
 */
function useChatInputAreaDictationSpeechRecognitionEventHandler({
    clearPendingStopFallback,
    handleDictationFinalResult,
    state,
}: UseChatInputAreaDictationSpeechRecognitionEventHandlerProps) {
    const { setDictationUiState, setDictationInterimText, setDictationError, setIsDictationPanelExpanded } = state;

    return useCallback(
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
                    setDictationUiState((currentState) =>
                        currentState === 'disabled' || currentState === 'error' ? currentState : 'idle',
                    );
                    setDictationInterimText('');
                    return;
            }
        },
        [
            clearPendingStopFallback,
            handleDictationFinalResult,
            setDictationError,
            setDictationInterimText,
            setDictationUiState,
            setIsDictationPanelExpanded,
        ],
    );
}

/**
 * Wires the speech-recognition subscription and shutdown cleanup for dictation.
 *
 * @private function of `useChatInputAreaDictation`
 */
function useChatInputAreaDictationSpeechRecognitionLifecycle({
    speechRecognition,
    clearPendingStopFallback,
    handleSpeechRecognitionEvent,
}: UseChatInputAreaDictationSpeechRecognitionLifecycleProps): void {
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
}

/**
 * Builds start/stop/toggle handlers for the speech-recognition session.
 *
 * @private function of `useChatInputAreaDictation`
 */
function useChatInputAreaDictationVoiceInputControls({
    speechRecognition,
    textareaRef,
    resolvedSpeechRecognitionLanguage,
    whisperMode,
    pendingStopFallbackRef,
    dictationInsertionSelectionRef,
    clearPendingStopFallback,
    state,
}: UseChatInputAreaDictationVoiceInputControlsProps) {
    const { dictationUiState, setDictationUiState, setDictationInterimText, setDictationError } = state;

    const startVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        captureDictationInsertionSelection(textareaRef, dictationInsertionSelectionRef);
        setDictationError(null);
        setDictationInterimText('');
        setDictationUiState('listening');
        speechRecognition.$start({
            language: resolvedSpeechRecognitionLanguage,
            interimResults: true,
            whisperMode,
        });
    }, [
        dictationInsertionSelectionRef,
        resolvedSpeechRecognitionLanguage,
        setDictationError,
        setDictationInterimText,
        setDictationUiState,
        speechRecognition,
        textareaRef,
        whisperMode,
    ]);

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
    }, [
        clearPendingStopFallback,
        pendingStopFallbackRef,
        setDictationInterimText,
        setDictationUiState,
        speechRecognition,
    ]);

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

    const handleRetryPermissionRequest = useCallback(() => {
        setDictationError(null);
        setDictationUiState('idle');
        handleToggleVoiceInput();
    }, [handleToggleVoiceInput, setDictationError, setDictationUiState]);

    return {
        handleToggleVoiceInput,
        handleRetryPermissionRequest,
    };
}

/**
 * Builds the correction and backtrack handlers for the latest finalized chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function useChatInputAreaDictationCorrectionHandlers({
    dictationChunks,
    dictationLastFinalChunk,
    dictationEditableChunk,
    dictationDictionary,
    dictationInsertionSelectionRef,
    messageContentRef,
    applyMessageContent,
    focusTextareaSelection,
    setDictationChunks,
    setDictationLastFinalChunk,
    setDictationEditableChunk,
    setDictationDictionary,
}: UseChatInputAreaDictationCorrectionHandlersProps) {
    const handleBacktrackLastChunk = useCallback(() => {
        const previousChunks = [...dictationChunks];
        const lastChunk = previousChunks.pop();

        if (!lastChunk) {
            return;
        }

        const nextMessageContent = removeTrackedDictationChunk(messageContentRef.current, lastChunk);
        const nextCaret = Math.min(lastChunk.start, nextMessageContent.length);

        setDictationChunks(previousChunks);
        applyMessageContent(nextMessageContent);

        const previousFinalChunk = previousChunks[previousChunks.length - 1]?.finalText || '';
        setDictationLastFinalChunk(previousFinalChunk);
        setDictationEditableChunk(previousFinalChunk);
        updateDictationInsertionCaret(dictationInsertionSelectionRef, nextCaret);
        focusTextareaSelection(nextCaret, nextCaret);
    }, [
        applyMessageContent,
        dictationInsertionSelectionRef,
        dictationChunks,
        focusTextareaSelection,
        messageContentRef,
        setDictationChunks,
        setDictationEditableChunk,
        setDictationLastFinalChunk,
    ]);

    const handleApplyCorrection = useCallback(() => {
        const correctedChunk = resolveCorrectedDictationChunk(dictationEditableChunk, dictationLastFinalChunk);
        if (!correctedChunk) {
            return;
        }

        const lastChunk = dictationChunks[dictationChunks.length - 1];
        const nextMessageContent = lastChunk
            ? replaceTrackedDictationChunk(messageContentRef.current, lastChunk, correctedChunk)
            : replaceLastOccurrence(messageContentRef.current, dictationLastFinalChunk, correctedChunk);
        const correctionStart = lastChunk?.start ?? nextMessageContent.length;
        const correctionCaret = Math.min(correctionStart + correctedChunk.length, nextMessageContent.length);

        applyMessageContent(nextMessageContent);
        setDictationLastFinalChunk(correctedChunk);
        setDictationChunks((previousChunks) => replaceLastDictationChunk(previousChunks, correctedChunk));
        setDictationDictionary(learnDictationDictionary(dictationLastFinalChunk, correctedChunk, dictationDictionary));
        updateDictationInsertionCaret(dictationInsertionSelectionRef, correctionCaret);
        focusTextareaSelection(correctionCaret, correctionCaret);
    }, [
        applyMessageContent,
        dictationDictionary,
        dictationEditableChunk,
        dictationChunks,
        dictationInsertionSelectionRef,
        dictationLastFinalChunk,
        focusTextareaSelection,
        messageContentRef,
        setDictationChunks,
        setDictationDictionary,
        setDictationLastFinalChunk,
    ]);

    return {
        handleBacktrackLastChunk,
        handleApplyCorrection,
    };
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
    const dictationInsertionSelectionRef = useRef<DictationInsertionSelection | null>(null);
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

    const dictationState: UseChatInputAreaDictationState = {
        dictationUiState,
        setDictationUiState,
        setDictationInterimText,
        setDictationError,
        setDictationLastFinalChunk,
        setDictationEditableChunk,
        setDictationChunks,
        setIsDictationPanelExpanded,
    };
    const clearPendingStopFallback = useCallback(() => {
        clearPendingStopFallbackTimeout(pendingStopFallbackRef);
    }, []);
    const focusTextareaSelection = useTextareaSelectionFocus(textareaRef);
    const handleDictationFinalResult = useChatInputAreaDictationFinalResultHandler({
        textareaRef,
        messageContentRef,
        applyMessageContent,
        dictationSettings,
        dictationDictionary,
        dictationInsertionSelectionRef,
        focusTextareaSelection,
        state: dictationState,
    });
    const handleSpeechRecognitionEvent = useChatInputAreaDictationSpeechRecognitionEventHandler({
        clearPendingStopFallback,
        handleDictationFinalResult,
        state: dictationState,
    });

    useChatInputAreaDictationSpeechRecognitionLifecycle({
        speechRecognition,
        clearPendingStopFallback,
        handleSpeechRecognitionEvent,
    });

    const { handleToggleVoiceInput, handleRetryPermissionRequest } = useChatInputAreaDictationVoiceInputControls({
        speechRecognition,
        textareaRef,
        resolvedSpeechRecognitionLanguage,
        whisperMode: dictationSettings.whisperMode,
        pendingStopFallbackRef,
        dictationInsertionSelectionRef,
        clearPendingStopFallback,
        state: {
            dictationUiState,
            setDictationUiState,
            setDictationInterimText,
            setDictationError,
        },
    });
    const { handleBacktrackLastChunk, handleApplyCorrection } = useChatInputAreaDictationCorrectionHandlers({
        dictationChunks,
        dictationLastFinalChunk,
        dictationEditableChunk,
        dictationDictionary,
        dictationInsertionSelectionRef,
        messageContentRef,
        applyMessageContent,
        focusTextareaSelection,
        setDictationChunks,
        setDictationLastFinalChunk,
        setDictationEditableChunk,
        setDictationDictionary,
    });
    const handleOpenBrowserSettings = useCallback(() => {
        openBrowserSettings(microphoneSettingsUrl);
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
    const shouldShowDictationPanel = resolveShouldShowDictationPanel({
        speechRecognition,
        isDictationPanelExpanded,
        dictationUiState,
        dictationInterimText,
        dictationError,
        dictationLastFinalChunk,
    });

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
