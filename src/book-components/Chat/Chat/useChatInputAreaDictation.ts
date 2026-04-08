'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { SpeechRecognitionErrorCode, SpeechRecognitionEvent } from '../../../types/SpeechRecognition';
import { resolveSpeechRecognitionLanguage } from '../../../utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import type { ChatProps } from './ChatProps';

/**
 * Key used to persist dictation refinement preferences.
 *
 * @private function of `useChatInputAreaDictation`
 */
const DICTATION_PREFERENCES_STORAGE_KEY = 'promptbook-chat-dictation-preferences';

/**
 * Key used to persist user speech-correction dictionary.
 *
 * @private function of `useChatInputAreaDictation`
 */
const DICTATION_DICTIONARY_STORAGE_KEY = 'promptbook-chat-dictation-dictionary';

/**
 * Maximum number of learned dictionary replacements retained in local storage.
 *
 * @private function of `useChatInputAreaDictation`
 */
const MAX_DICTATION_DICTIONARY_ENTRIES = 200;

/**
 * Grace timeout after stop request to prevent a stuck listening state.
 *
 * @private function of `useChatInputAreaDictation`
 */
const STOP_LISTENING_FALLBACK_TIMEOUT_MS = 3000;

/**
 * Voice settings available for lightweight transcript refinement.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationRefinementSettings = {
    readonly autoPunctuation: boolean;
    readonly autoCapitalization: boolean;
    readonly removeFillerWords: boolean;
    readonly formatLists: boolean;
    readonly whisperMode: boolean;
};

/**
 * Fallback refinement settings when user has no saved preferences.
 *
 * @private function of `useChatInputAreaDictation`
 */
const DEFAULT_DICTATION_SETTINGS: DictationRefinementSettings = {
    autoPunctuation: true,
    autoCapitalization: true,
    removeFillerWords: false,
    formatLists: true,
    whisperMode: false,
};

/**
 * Runtime voice UI states shown on the primary microphone control.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationUiState = 'idle' | 'listening' | 'processing' | 'error' | 'disabled';

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
 * Dictionary map of corrected lower-case token to preferred token.
 *
 * @private function of `useChatInputAreaDictation`
 */
type DictationDictionary = Readonly<Record<string, string>>;

/**
 * Visual tone used by the floating speech-status bubble.
 *
 * @private function of `useChatInputAreaDictation`
 */
type SpeechStatusBubbleTone = 'neutral' | 'recording' | 'processing' | 'error';

/**
 * UI metadata derived from the current speech-recognition state.
 *
 * @private function of `useChatInputAreaDictation`
 */
type SpeechRecognitionUiDescriptor = {
    readonly buttonTitle: string;
    readonly bubbleText?: string;
    readonly bubbleTone?: SpeechStatusBubbleTone;
    readonly isButtonActive: boolean;
    readonly isButtonDisabled: boolean;
};

/**
 * Shared mapping from recognizer state to the chat voice-control UI.
 *
 * @private function of `useChatInputAreaDictation`
 */
const SPEECH_RECOGNITION_UI_DESCRIPTORS: Record<DictationUiState, SpeechRecognitionUiDescriptor> = {
    idle: {
        buttonTitle: 'Start dictation',
        isButtonActive: false,
        isButtonDisabled: false,
    },
    listening: {
        buttonTitle: 'Stop dictation',
        bubbleText: 'Listening...',
        bubbleTone: 'recording',
        isButtonActive: true,
        isButtonDisabled: false,
    },
    processing: {
        buttonTitle: 'Processing dictated speech...',
        bubbleText: 'Processing speech...',
        bubbleTone: 'processing',
        isButtonActive: true,
        isButtonDisabled: false,
    },
    error: {
        buttonTitle: 'Dictation failed. Tap to retry.',
        bubbleText: 'Dictation failed. Tap microphone to retry.',
        bubbleTone: 'error',
        isButtonActive: false,
        isButtonDisabled: false,
    },
    disabled: {
        buttonTitle: 'Microphone permission blocked. Tap to re-request.',
        bubbleText: 'Microphone permission is blocked.',
        bubbleTone: 'error',
        isButtonActive: false,
        isButtonDisabled: false,
    },
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
 * Resolves voice-button and floating-bubble UI from a speech-recognition state.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveSpeechRecognitionUiDescriptor(state: DictationUiState): SpeechRecognitionUiDescriptor {
    return SPEECH_RECOGNITION_UI_DESCRIPTORS[state];
}

/**
 * Escape helper for dynamic RegExp creation.
 *
 * @private function of `useChatInputAreaDictation`
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes free-form transcript whitespace.
 *
 * @private function of `useChatInputAreaDictation`
 */
function normalizeDictationWhitespace(text: string): string {
    return text.replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').trim();
}

/**
 * Applies learned dictionary replacements to one transcript chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function applyDictationDictionary(text: string, dictionary: DictationDictionary): string {
    let nextText = text;

    for (const [source, target] of Object.entries(dictionary)) {
        if (!source || !target) {
            continue;
        }

        const sourcePattern = new RegExp(`\\b${escapeRegExp(source)}\\b`, 'gi');
        nextText = nextText.replace(sourcePattern, target);
    }

    return nextText;
}

/**
 * Applies spoken formatting commands such as "new line" and "bullet".
 *
 * @private function of `useChatInputAreaDictation`
 */
function applyDictationFormattingCommands(text: string): string {
    return text
        .replace(/\bnew\s+line\b/gi, '\n')
        .replace(/\bnewline\b/gi, '\n')
        .replace(/\bbullet\b/gi, '\n- ')
        .replace(/\bnumbered\s+list\b/gi, '\n1. ');
}

/**
 * Removes filler words to keep dictated text concise.
 *
 * @private function of `useChatInputAreaDictation`
 */
function removeDictationFillers(text: string): string {
    const stripped = text.replace(/\b(um+|uh+|like)\b/gi, '');
    return normalizeDictationWhitespace(stripped);
}

/**
 * Capitalizes sentence starts in one transcript chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function autoCapitalizeDictationText(text: string): string {
    return text.replace(/(^|[\n.!?]\s*)([a-z])/g, (_match, prefix: string, letter: string) => {
        return `${prefix}${letter.toUpperCase()}`;
    });
}

/**
 * Ensures final dictated chunk ends with punctuation when appropriate.
 *
 * @private function of `useChatInputAreaDictation`
 */
function applyDictationPunctuation(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) {
        return trimmed;
    }

    if (/[.!?:;]$/.test(trimmed) || trimmed.endsWith('\n')) {
        return trimmed;
    }

    return `${trimmed}.`;
}

/**
 * Applies refinement settings and dictionary corrections to one final chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function refineFinalDictationChunk(
    rawChunk: string,
    settings: DictationRefinementSettings,
    dictionary: DictationDictionary,
): string {
    let refined = normalizeDictationWhitespace(rawChunk);

    if (!refined) {
        return '';
    }

    refined = applyDictationDictionary(refined, dictionary);

    if (settings.formatLists) {
        refined = applyDictationFormattingCommands(refined);
    }

    if (settings.removeFillerWords) {
        refined = removeDictationFillers(refined);
    }

    if (settings.autoCapitalization) {
        refined = autoCapitalizeDictationText(refined);
    }

    if (settings.autoPunctuation) {
        refined = applyDictationPunctuation(refined);
    }

    return normalizeDictationWhitespace(refined);
}

/**
 * Produces insertion metadata for one dictated chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function insertDictationChunk(params: {
    readonly currentValue: string;
    readonly dictatedText: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
    readonly shouldReplaceSelection: boolean;
}): { nextValue: string; start: number; caret: number } {
    const { currentValue, dictatedText, selectionStart, selectionEnd, shouldReplaceSelection } = params;
    const replaceStart = shouldReplaceSelection ? selectionStart : selectionStart;
    const replaceEnd = shouldReplaceSelection ? selectionEnd : selectionStart;
    const prefix = currentValue.slice(0, replaceStart);
    const suffix = currentValue.slice(replaceEnd);
    const previousCharacter = prefix.slice(-1);
    const needsLeadingSpace = Boolean(
        prefix &&
            previousCharacter &&
            !/\s/.test(previousCharacter) &&
            !dictatedText.startsWith('\n') &&
            !/^[,.;:!?)]/.test(dictatedText),
    );

    const inserted = `${needsLeadingSpace ? ' ' : ''}${dictatedText}`;
    const nextValue = `${prefix}${inserted}${suffix}`;
    const start = replaceStart + (needsLeadingSpace ? 1 : 0);
    const caret = prefix.length + inserted.length;

    return {
        nextValue,
        start,
        caret,
    };
}

/**
 * Replaces last occurrence of one chunk inside text.
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
 * Learns correction pairs from user-edited transcript chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
function learnDictationDictionary(
    previousChunk: string,
    correctedChunk: string,
    previousDictionary: DictationDictionary,
): DictationDictionary {
    const nextDictionary: Record<string, string> = { ...previousDictionary };
    const previousWords = previousChunk.split(/\s+/).filter(Boolean);
    const correctedWords = correctedChunk.split(/\s+/).filter(Boolean);

    if (previousWords.length === correctedWords.length && previousWords.length > 0) {
        for (let index = 0; index < previousWords.length; index++) {
            const previousWord = previousWords[index];
            const correctedWord = correctedWords[index];

            if (!previousWord || !correctedWord) {
                continue;
            }

            if (previousWord.toLowerCase() !== correctedWord.toLowerCase()) {
                nextDictionary[previousWord.toLowerCase()] = correctedWord;
            }
        }
    }

    const dictionaryEntries = Object.entries(nextDictionary).slice(-MAX_DICTATION_DICTIONARY_ENTRIES);
    return Object.fromEntries(dictionaryEntries);
}

/**
 * Safely loads dictation preferences from local storage.
 *
 * @private function of `useChatInputAreaDictation`
 */
function loadDictationPreferences(): DictationRefinementSettings {
    if (typeof window === 'undefined') {
        return DEFAULT_DICTATION_SETTINGS;
    }

    try {
        const rawValue = window.localStorage.getItem(DICTATION_PREFERENCES_STORAGE_KEY);
        if (!rawValue) {
            return DEFAULT_DICTATION_SETTINGS;
        }

        const parsedValue = JSON.parse(rawValue) as Partial<DictationRefinementSettings>;
        return {
            autoPunctuation: parsedValue.autoPunctuation ?? DEFAULT_DICTATION_SETTINGS.autoPunctuation,
            autoCapitalization: parsedValue.autoCapitalization ?? DEFAULT_DICTATION_SETTINGS.autoCapitalization,
            removeFillerWords: parsedValue.removeFillerWords ?? DEFAULT_DICTATION_SETTINGS.removeFillerWords,
            formatLists: parsedValue.formatLists ?? DEFAULT_DICTATION_SETTINGS.formatLists,
            whisperMode: parsedValue.whisperMode ?? DEFAULT_DICTATION_SETTINGS.whisperMode,
        };
    } catch {
        return DEFAULT_DICTATION_SETTINGS;
    }
}

/**
 * Safely loads learned dictation dictionary from local storage.
 *
 * @private function of `useChatInputAreaDictation`
 */
function loadDictationDictionary(): DictationDictionary {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const rawValue = window.localStorage.getItem(DICTATION_DICTIONARY_STORAGE_KEY);
        if (!rawValue) {
            return {};
        }

        const parsedValue = JSON.parse(rawValue) as DictationDictionary;
        return parsedValue || {};
    } catch {
        return {};
    }
}

/**
 * Persists dictation preferences.
 *
 * @private function of `useChatInputAreaDictation`
 */
function saveDictationPreferences(value: DictationRefinementSettings): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(DICTATION_PREFERENCES_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Persisting preferences is best-effort.
    }
}

/**
 * Persists learned dictation dictionary.
 *
 * @private function of `useChatInputAreaDictation`
 */
function saveDictationDictionary(value: DictationDictionary): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(DICTATION_DICTIONARY_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Persisting dictionary is best-effort.
    }
}

/**
 * Resolves browser-specific microphone settings URL when available.
 *
 * @private function of `useChatInputAreaDictation`
 */
function resolveMicrophoneSettingsUrl(): string | undefined {
    if (typeof navigator === 'undefined') {
        return undefined;
    }

    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome') || userAgent.includes('edg')) {
        return 'chrome://settings/content/microphone';
    }

    if (userAgent.includes('firefox')) {
        return 'about:preferences#privacy';
    }

    return undefined;
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
    const [dictationError, setDictationError] = useState<{ code?: SpeechRecognitionErrorCode; message: string } | null>(
        null,
    );
    const [dictationLastFinalChunk, setDictationLastFinalChunk] = useState('');
    const [dictationEditableChunk, setDictationEditableChunk] = useState('');
    const [dictationChunks, setDictationChunks] = useState<Array<DictationChunk>>([]);
    const [isDictationPanelExpanded, setIsDictationPanelExpanded] = useState(false);
    const [dictationSettings, setDictationSettings] = useState<DictationRefinementSettings>(() =>
        loadDictationPreferences(),
    );
    const [dictationDictionary, setDictationDictionary] = useState<DictationDictionary>(() => loadDictationDictionary());
    const speechRecognitionUiDescriptor = useMemo(
        () => resolveSpeechRecognitionUiDescriptor(dictationUiState),
        [dictationUiState],
    );
    const resolvedSpeechRecognitionLanguage = useMemo(
        () => resolveSpeechRecognitionLanguage({ overrideLanguage: speechRecognitionLanguage }),
        [speechRecognitionLanguage],
    );
    const isBrowserSpeechFallbackSupported = useMemo(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        const webSpeechWindow = window as Window & {
            readonly SpeechRecognition?: unknown;
            readonly webkitSpeechRecognition?: unknown;
        };

        return Boolean(webSpeechWindow.SpeechRecognition || webSpeechWindow.webkitSpeechRecognition);
    }, []);
    const microphoneSettingsUrl = useMemo(() => resolveMicrophoneSettingsUrl(), []);

    const clearPendingStopFallback = useCallback(() => {
        if (!pendingStopFallbackRef.current) {
            return;
        }

        clearTimeout(pendingStopFallbackRef.current);
        pendingStopFallbackRef.current = null;
    }, []);

    useEffect(() => {
        saveDictationPreferences(dictationSettings);
    }, [dictationSettings]);

    useEffect(() => {
        saveDictationDictionary(dictationDictionary);
    }, [dictationDictionary]);

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
            setDictationChunks((previous) => [
                ...previous,
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

            requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(insertion.caret, insertion.caret);
            });
        },
        [applyMessageContent, dictationDictionary, dictationSettings, messageContentRef, textareaRef],
    );

    useEffect(() => {
        if (!speechRecognition) {
            return;
        }

        const unsubscribe = speechRecognition.subscribe((event: SpeechRecognitionEvent) => {
            if (event.type === 'START') {
                clearPendingStopFallback();
                setDictationUiState('listening');
                setDictationError(null);
                return;
            }

            if (event.type === 'TRANSCRIBING') {
                setDictationUiState('processing');
                return;
            }

            if (event.type === 'RESULT') {
                if (event.isFinal) {
                    handleDictationFinalResult(event.text);
                } else {
                    setDictationInterimText(event.text);
                    setIsDictationPanelExpanded(true);
                }
                return;
            }

            if (event.type === 'ERROR') {
                clearPendingStopFallback();
                setDictationError({
                    code: event.code,
                    message: event.message,
                });
                setDictationUiState(event.code === 'permission-denied' ? 'disabled' : 'error');
                setIsDictationPanelExpanded(true);
                return;
            }

            if (event.type === 'STOP') {
                clearPendingStopFallback();
                setDictationUiState((currentState) => (currentState === 'disabled' ? currentState : 'idle'));
                setDictationInterimText('');
            }
        });

        return () => {
            clearPendingStopFallback();
            unsubscribe();
        };
    }, [clearPendingStopFallback, handleDictationFinalResult, speechRecognition]);

    useEffect(() => {
        return () => {
            clearPendingStopFallback();
            speechRecognition?.$stop();
        };
    }, [clearPendingStopFallback, speechRecognition]);

    const handleToggleVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        if (dictationUiState === 'listening' || dictationUiState === 'processing') {
            setDictationUiState('processing');
            speechRecognition.$stop();
            clearPendingStopFallback();
            pendingStopFallbackRef.current = setTimeout(() => {
                setDictationUiState('idle');
                setDictationInterimText('');
            }, STOP_LISTENING_FALLBACK_TIMEOUT_MS);
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
    }, [
        clearPendingStopFallback,
        dictationSettings,
        dictationUiState,
        resolvedSpeechRecognitionLanguage,
        speechRecognition,
        textareaRef,
    ]);

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

        requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) {
                return;
            }

            textarea.focus();
            textarea.setSelectionRange(lastChunk.start, lastChunk.start);
        });
    }, [applyMessageContent, dictationChunks, textareaRef]);

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
            setDictationSettings((previous) => ({
                ...previous,
                [settingName]: checked,
            }));
        },
        [],
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
