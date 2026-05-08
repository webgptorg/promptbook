'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
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
    readonly replaceSelectionOnNextFinalRef: MutableRefObject<boolean>;
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
    readonly replaceSelectionOnNextFinalRef: MutableRefObject<boolean>;
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
 * Captures whether the next finalized chunk should replace the current selection.
 *
 * @private function of `useChatInputAreaDictation`
 */
function captureSelectionReplacementIntent(
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>,
    replaceSelectionOnNextFinalRef: MutableRefObject<boolean>,
): void {
    const textarea = textareaRef.current;
    if (!textarea) {
        return;
    }

    const { selectionStart, selectionEnd } = resolveTextareaSelection(textarea, 0);
    replaceSelectionOnNextFinalRef.current = selectionStart !== selectionEnd;
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
    replaceSelectionOnNextFinalRef,
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

            const { selectionStart, selectionEnd } = resolveTextareaSelection(textarea, previousMessageContent.length);
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
            dictationSettings,
            focusTextareaSelection,
            messageContentRef,
            replaceSelectionOnNextFinalRef,
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
                    setDictationUiState((currentState) => (currentState === 'disabled' ? currentState : 'idle'));
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
    replaceSelectionOnNextFinalRef,
    clearPendingStopFallback,
    state,
}: UseChatInputAreaDictationVoiceInputControlsProps) {
    const { dictationUiState, setDictationUiState, setDictationInterimText, setDictationError } = state;

    const startVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        captureSelectionReplacementIntent(textareaRef, replaceSelectionOnNextFinalRef);
        setDictationError(null);
        setDictationInterimText('');
        setDictationUiState('listening');
        speechRecognition.$start({
            language: resolvedSpeechRecognitionLanguage,
            interimResults: true,
            whisperMode,
        });
    }, [
        replaceSelectionOnNextFinalRef,
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

        setDictationChunks(previousChunks);
        applyMessageContent(lastChunk.beforeValue);

        const previousFinalChunk = previousChunks[previousChunks.length - 1]?.finalText || '';
        setDictationLastFinalChunk(previousFinalChunk);
        setDictationEditableChunk(previousFinalChunk);
        focusTextareaSelection(lastChunk.start, lastChunk.start);
    }, [
        applyMessageContent,
        dictationChunks,
        focusTextareaSelection,
        setDictationChunks,
        setDictationEditableChunk,
        setDictationLastFinalChunk,
    ]);

    const handleApplyCorrection = useCallback(() => {
        const correctedChunk = resolveCorrectedDictationChunk(dictationEditableChunk, dictationLastFinalChunk);
        if (!correctedChunk) {
            return;
        }

        const nextMessageContent = replaceLastOccurrence(
            messageContentRef.current,
            dictationLastFinalChunk,
            correctedChunk,
        );

        applyMessageContent(nextMessageContent);
        setDictationLastFinalChunk(correctedChunk);
        setDictationChunks((previousChunks) => replaceLastDictationChunk(previousChunks, correctedChunk));
        setDictationDictionary(learnDictationDictionary(dictationLastFinalChunk, correctedChunk, dictationDictionary));
    }, [
        applyMessageContent,
        dictationDictionary,
        dictationEditableChunk,
        dictationLastFinalChunk,
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
        replaceSelectionOnNextFinalRef,
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
        replaceSelectionOnNextFinalRef,
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
