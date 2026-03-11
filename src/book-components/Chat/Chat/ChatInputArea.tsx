'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ChangeEvent,
    type ClipboardEvent,
    type DragEvent,
    type MouseEvent,
} from 'react';
import spaceTrim from 'spacetrim';
import { USER_CHAT_COLOR } from '../../../config';
import type { SpeechRecognitionEvent, SpeechRecognitionErrorCode } from '../../../types/SpeechRecognition';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { grayscale } from '../../../utils/color/operators/grayscale';
import { lighten } from '../../../utils/color/operators/lighten';
import { resolveSpeechRecognitionLanguage } from '../../../utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { AttachmentIcon } from '../../icons/AttachmentIcon';
import { CloseIcon } from '../../icons/CloseIcon';
import { MicIcon } from '../../icons/MicIcon';
import { SendIcon } from '../../icons/SendIcon';
import type { ChatParticipant } from '../types/ChatParticipant';
import styles from './Chat.module.css';
import type { ChatProps, ChatSoundSystem } from './ChatProps';

/**
 * Key used to persist dictation refinement preferences.
 *
 * @private component of `<Chat/>`
 */
const DICTATION_PREFERENCES_STORAGE_KEY = 'promptbook-chat-dictation-preferences';

/**
 * Key used to persist user speech-correction dictionary.
 *
 * @private component of `<Chat/>`
 */
const DICTATION_DICTIONARY_STORAGE_KEY = 'promptbook-chat-dictation-dictionary';

/**
 * Maximum number of learned dictionary replacements retained in local storage.
 *
 * @private component of `<Chat/>`
 */
const MAX_DICTATION_DICTIONARY_ENTRIES = 200;

/**
 * Grace timeout after stop request to prevent a stuck listening state.
 *
 * @private component of `<Chat/>`
 */
const STOP_LISTENING_FALLBACK_TIMEOUT_MS = 3000;

/**
 * Wrapper for consistent button-click sound handling.
 *
 * @private component of `<Chat/>`
 */
export type ChatInputButtonClickHandler = (
    handler?: (event: MouseEvent<HTMLButtonElement>) => void,
) => (event: MouseEvent<HTMLButtonElement>) => void;

/**
 * Internal representation of an uploaded file in the chat input.
 *
 * @private component of `<Chat/>`
 */
export type ChatInputUploadedFile = {
    id: string;
    file: File;
    content: string;
};

/**
 * Props for the chat input area.
 *
 * @private component of `<Chat/>`
 */
export type ChatInputAreaProps = {
    onMessage?: ChatProps['onMessage'];
    onChange?: ChatProps['onChange'];
    onFileUpload?: ChatProps['onFileUpload'];
    speechRecognition?: ChatProps['speechRecognition'];
    speechRecognitionLanguage?: ChatProps['speechRecognitionLanguage'];
    defaultMessage?: string;
    placeholderMessageContent?: string;
    isFocusedOnLoad?: boolean;
    isMobile: boolean;
    isVoiceCalling?: boolean;
    participants: ReadonlyArray<ChatParticipant>;
    buttonColor: WithTake<Color>;
    soundSystem?: ChatSoundSystem;
    onButtonClick: ChatInputButtonClickHandler;
    chatInputClassName?: string;
};

/**
 * Voice settings available for lightweight transcript refinement.
 *
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
 */
type DictationUiState = 'idle' | 'listening' | 'processing' | 'error' | 'disabled';

/**
 * Captured metadata for one finalized dictated chunk.
 *
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
 */
type DictationDictionary = Readonly<Record<string, string>>;

/**
 * Visual tone used by the floating speech-status bubble.
 *
 * @private component of `<Chat/>`
 */
type SpeechStatusBubbleTone = 'neutral' | 'recording' | 'processing' | 'error';

/**
 * UI metadata derived from the current speech-recognition state.
 *
 * @private component of `<Chat/>`
 */
type SpeechRecognitionUiDescriptor = {
    /**
     * Tooltip and assistive text for the microphone button.
     */
    readonly buttonTitle: string;
    /**
     * Optional floating-bubble text shown while speech processing is active.
     */
    readonly bubbleText?: string;
    /**
     * Visual color variant for the speech-status bubble.
     */
    readonly bubbleTone?: SpeechStatusBubbleTone;
    /**
     * Whether the voice button should use active styling.
     */
    readonly isButtonActive: boolean;
    /**
     * Whether the voice button should be disabled.
     */
    readonly isButtonDisabled: boolean;
};

/**
 * Shared mapping from recognizer state to the chat voice-control UI.
 *
 * @private component of `<Chat/>`
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
 * Resolves voice-button and floating-bubble UI from a speech-recognition state.
 *
 * @param state Current speech-recognition state.
 * @returns Voice-control UI descriptor.
 * @private component of `<Chat/>`
 */
function resolveSpeechRecognitionUiDescriptor(state: DictationUiState): SpeechRecognitionUiDescriptor {
    return SPEECH_RECOGNITION_UI_DESCRIPTORS[state];
}

/**
 * Escape helper for dynamic RegExp creation.
 *
 * @private component of `<Chat/>`
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes free-form transcript whitespace.
 *
 * @private component of `<Chat/>`
 */
function normalizeDictationWhitespace(text: string): string {
    return text
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();
}

/**
 * Applies learned dictionary replacements to one transcript chunk.
 *
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
 */
function removeDictationFillers(text: string): string {
    const stripped = text.replace(/\b(um+|uh+|like)\b/gi, '');
    return normalizeDictationWhitespace(stripped);
}

/**
 * Capitalizes sentence starts in one transcript chunk.
 *
 * @private component of `<Chat/>`
 */
function autoCapitalizeDictationText(text: string): string {
    return text.replace(/(^|[\n.!?]\s*)([a-z])/g, (_match, prefix: string, letter: string) => {
        return `${prefix}${letter.toUpperCase()}`;
    });
}

/**
 * Ensures final dictated chunk ends with punctuation when appropriate.
 *
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * @private component of `<Chat/>`
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
 * Renders the chat input area with text, file upload, and voice controls.
 *
 * @private component of `<Chat/>`
 */
export function ChatInputArea(props: ChatInputAreaProps) {
    const {
        onMessage,
        onChange,
        onFileUpload,
        speechRecognition,
        speechRecognitionLanguage,
        defaultMessage,
        placeholderMessageContent,
        isFocusedOnLoad,
        isMobile,
        isVoiceCalling,
        participants,
        buttonColor,
        soundSystem,
        onButtonClick,
        chatInputClassName,
    } = props;
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pendingStopFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replaceSelectionOnNextFinalRef = useRef(false);
    const [messageContent, setMessageContent] = useState(defaultMessage || '');
    const messageContentRef = useRef(messageContent);
    const [uploadedFiles, setUploadedFiles] = useState<Array<ChatInputUploadedFile>>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
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
    const [dictationDictionary, setDictationDictionary] = useState<DictationDictionary>(() =>
        loadDictationDictionary(),
    );
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
        messageContentRef.current = messageContent;
    }, [messageContent]);

    useEffect(() => {
        setMessageContent(defaultMessage || '');
    }, [defaultMessage]);

    useEffect(() => {
        saveDictationPreferences(dictationSettings);
    }, [dictationSettings]);

    useEffect(() => {
        saveDictationDictionary(dictationDictionary);
    }, [dictationDictionary]);

    useEffect(
        (/* Focus textarea on page load */) => {
            if (!textareaRef.current) {
                return;
            }

            const shouldFocus = isFocusedOnLoad ?? !isMobile;

            if (shouldFocus) {
                textareaRef.current.focus();
            }
        },
        [textareaRef, isMobile, isFocusedOnLoad],
    );

    const handleDictationFinalResult = useCallback(
        (rawText: string) => {
            const textarea = textareaRef.current;
            if (!textarea) {
                return;
            }

            const refinedText = refineFinalDictationChunk(rawText, dictationSettings, dictationDictionary);
            if (!refinedText) {
                return;
            }

            const selectionStart = textarea.selectionStart ?? messageContentRef.current.length;
            const selectionEnd = textarea.selectionEnd ?? selectionStart;
            const insertion = insertDictationChunk({
                currentValue: messageContentRef.current,
                dictatedText: refinedText,
                selectionStart,
                selectionEnd,
                shouldReplaceSelection: replaceSelectionOnNextFinalRef.current,
            });

            replaceSelectionOnNextFinalRef.current = false;
            setDictationInterimText('');
            setDictationError(null);
            setDictationUiState('listening');
            setMessageContent(insertion.nextValue);
            onChange?.(insertion.nextValue);

            setDictationChunks((previous) => [
                ...previous,
                {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    beforeValue: messageContentRef.current,
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
        [dictationSettings, dictationDictionary, onChange],
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
    }, [speechRecognition, handleDictationFinalResult, clearPendingStopFallback]);

    useEffect(() => {
        return () => {
            clearPendingStopFallback();
            speechRecognition?.$stop();
        };
    }, [speechRecognition, clearPendingStopFallback]);

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
        speechRecognition,
        dictationUiState,
        resolvedSpeechRecognitionLanguage,
        clearPendingStopFallback,
        dictationSettings,
    ]);

    const handleBacktrackLastChunk = useCallback(() => {
        const previousChunks = [...dictationChunks];
        const lastChunk = previousChunks.pop();

        if (!lastChunk) {
            return;
        }

        setDictationChunks(previousChunks);
        setMessageContent(lastChunk.beforeValue);
        onChange?.(lastChunk.beforeValue);

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
    }, [dictationChunks, onChange]);

    const handleApplyCorrection = useCallback(() => {
        const correctedChunk = normalizeDictationWhitespace(dictationEditableChunk);
        const previousChunk = dictationLastFinalChunk;

        if (!correctedChunk || !previousChunk || correctedChunk === previousChunk) {
            return;
        }

        const nextMessageContent = replaceLastOccurrence(messageContentRef.current, previousChunk, correctedChunk);
        setMessageContent(nextMessageContent);
        onChange?.(nextMessageContent);
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

        const learnedDictionary = learnDictationDictionary(previousChunk, correctedChunk, dictationDictionary);
        setDictationDictionary(learnedDictionary);
    }, [dictationEditableChunk, dictationLastFinalChunk, onChange, dictationDictionary]);

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

    const handleTextInputChange = useCallback(
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            const nextContent = event.target.value;
            setMessageContent(nextContent);
            onChange?.(nextContent);
        },
        [onChange],
    );

    const handleFileUpload = useCallback(
        async (files: FileList | File[]) => {
            if (!onFileUpload) {
                return;
            }

            setIsUploading(true);
            const fileArray = Array.from(files);

            try {
                const newUploadedFiles: Array<ChatInputUploadedFile> = [];
                for (const file of fileArray) {
                    const content = await onFileUpload(file);
                    newUploadedFiles.push({
                        id: Math.random().toString(36).substring(2),
                        file,
                        content,
                    });
                }

                setUploadedFiles((previous) => [...previous, ...newUploadedFiles]);
            } catch (error) {
                console.error('File upload failed:', error);
                alert('File upload failed. Please try again.');
            } finally {
                setIsUploading(false);
            }
        },
        [onFileUpload],
    );

    const handleDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) {
                return;
            }

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        },
        [onFileUpload, handleFileUpload],
    );

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
    }, []);

    const handlePaste = useCallback(
        (event: ClipboardEvent) => {
            if (!onFileUpload) {
                return;
            }

            const files = event.clipboardData.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        },
        [onFileUpload, handleFileUpload],
    );

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                handleFileUpload(files);
            }
            event.target.value = '';
        },
        [handleFileUpload],
    );

    const removeUploadedFile = useCallback((fileId: string) => {
        setUploadedFiles((previous) => previous.filter((file) => file.id !== fileId));
    }, []);

    const handleSend = useCallback(async () => {
        if (!onMessage) {
            throw new Error(`Can not find onMessage callback`);
        }

        const textareaElement = textareaRef.current;

        if (!textareaElement) {
            throw new Error(`Can not find textarea`);
        }

        const wasTextareaFocused = document.activeElement === textareaElement;

        try {
            const attachments = uploadedFiles.map((uploadedFile) => ({
                name: uploadedFile.file.name,
                type: uploadedFile.file.type,
                url: uploadedFile.content,
            }));

            if (spaceTrim(messageContent) === '' && attachments.length === 0) {
                throw new Error(`You need to write some text or upload a file`);
            }

            if (soundSystem) {
                /* not await */ soundSystem.play('message_send');
            }

            await (onMessage as unknown as (
                message: string,
                attachments: Array<{ name: string; type: string; url: string }>,
            ) => Promise<void>)(messageContent, attachments);

            setMessageContent('');
            setUploadedFiles([]);
            onChange?.('');

            if (wasTextareaFocused) {
                textareaElement.focus();
            }
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.error(error);
            alert(error.message);
        }
    }, [onMessage, uploadedFiles, soundSystem, messageContent, onChange]);

    if (!onMessage) {
        return null;
    }

    const myColor = participants.find((participant) => participant.isMe)?.color || USER_CHAT_COLOR;
    const inputBgColor = Color.from(myColor).then(lighten(0.4)).then(grayscale(0.7));
    const inputTextColor = inputBgColor.then(textColor);
    const shouldShowDictationPanel = Boolean(
        speechRecognition &&
            (isDictationPanelExpanded ||
                dictationUiState !== 'idle' ||
                Boolean(dictationInterimText) ||
                Boolean(dictationError) ||
                Boolean(dictationLastFinalChunk)),
    );

    return (
        <div
            className={classNames(styles.chatInput, chatInputClassName, isDragOver && styles.dragOver)}
            {...(onFileUpload
                ? {
                      onDrop: handleDrop,
                      onDragOver: handleDragOver,
                      onDragLeave: handleDragLeave,
                  }
                : {})}
        >
            {uploadedFiles.length > 0 && (
                <div className={styles.filePreviewContainer}>
                    {uploadedFiles.map((uploadedFile) => (
                        <div key={uploadedFile.id} className={styles.filePreview}>
                            <div className={styles.fileIcon}>📎</div>
                            <div className={styles.fileInfo}>
                                <div className={styles.fileName}>{uploadedFile.file.name}</div>
                                <div className={styles.fileSize}>{(uploadedFile.file.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <button
                                className={styles.removeFileButton}
                                onClick={() => removeUploadedFile(uploadedFile.id)}
                                title="Remove file"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div
                className={styles.inputContainer}
                style={
                    {
                        '--chat-placeholder-color': '#fff',
                        '--input-bg-color': inputBgColor.toHex(),
                        '--input-text-color': inputTextColor.toHex(),
                        '--brand-color': buttonColor.toHex(),
                    } as CSSProperties
                }
            >
                <textarea
                    ref={(element) => {
                        textareaRef.current = element;
                    }}
                    onPaste={handlePaste}
                    value={messageContent}
                    placeholder={placeholderMessageContent || 'Write a message...'}
                    onChange={handleTextInputChange}
                    onKeyDown={(event) => {
                        if (event.shiftKey) {
                            return;
                        }
                        if (event.key !== 'Enter') {
                            return;
                        }

                        event.preventDefault();
                        /* not await */ handleSend();
                    }}
                />

                {onFileUpload && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileInputChange}
                        />
                        <button
                            type="button"
                            style={{
                                backgroundColor: buttonColor.toHex(),
                                color: buttonColor.then(textColor).toHex(),
                            }}
                            className={styles.attachmentButton}
                            onClick={onButtonClick(() => fileInputRef.current?.click())}
                            disabled={isUploading}
                            title="Attach file"
                        >
                            <AttachmentIcon size={20} />
                        </button>
                    </>
                )}

                {speechRecognition && (
                    <button
                        data-button-type="voice"
                        disabled={speechRecognitionUiDescriptor.isButtonDisabled}
                        style={{
                            backgroundColor: speechRecognitionUiDescriptor.isButtonActive
                                ? Color.from('#ff4444').toHex()
                                : buttonColor.toHex(),
                            color: speechRecognitionUiDescriptor.isButtonActive
                                ? Color.from('#ffffff').toHex()
                                : buttonColor.then(textColor).toHex(),
                        }}
                        className={classNames(
                            styles.voiceButton,
                            (isVoiceCalling || speechRecognitionUiDescriptor.isButtonActive) &&
                                styles.voiceButtonActive,
                        )}
                        onClick={onButtonClick((event) => {
                            event.preventDefault();
                            handleToggleVoiceInput();
                        })}
                        title={speechRecognitionUiDescriptor.buttonTitle}
                        aria-label={speechRecognitionUiDescriptor.buttonTitle}
                    >
                        <MicIcon size={25} />
                    </button>
                )}

                <button
                    data-button-type="call-to-action"
                    style={{
                        backgroundColor: buttonColor.toHex(),
                        color: buttonColor.then(textColor).toHex(),
                    }}
                    onClick={onButtonClick((event) => {
                        event.preventDefault();
                        /* not await */ handleSend();
                    })}
                >
                    <SendIcon size={25} />
                </button>
            </div>

            {speechRecognition && speechRecognitionUiDescriptor.bubbleText && (
                <button
                    className={classNames(
                        styles.speechStatusBubble,
                        speechRecognitionUiDescriptor.bubbleTone === 'recording' && styles.speechStatusBubbleRecording,
                        speechRecognitionUiDescriptor.bubbleTone === 'processing' &&
                            styles.speechStatusBubbleProcessing,
                        speechRecognitionUiDescriptor.bubbleTone === 'error' && styles.speechStatusBubbleError,
                    )}
                    aria-live="polite"
                    type="button"
                    onClick={() => setIsDictationPanelExpanded((value) => !value)}
                >
                    <span className={styles.speechStatusBubbleDot} aria-hidden="true" />
                    <span>{speechRecognitionUiDescriptor.bubbleText}</span>
                </button>
            )}

            {shouldShowDictationPanel && (
                <section className={styles.dictationPanel} aria-live="polite">
                    <div className={styles.dictationPanelHeader}>
                        <span className={styles.dictationPanelTitle}>Dictation</span>
                        <button
                            type="button"
                            className={styles.dictationPanelToggle}
                            onClick={() => setIsDictationPanelExpanded((value) => !value)}
                        >
                            {isDictationPanelExpanded ? 'Hide details' : 'Show details'}
                        </button>
                    </div>

                    {dictationInterimText && (
                        <button
                            type="button"
                            className={styles.dictationInterimTranscript}
                            onClick={() => setIsDictationPanelExpanded(true)}
                        >
                            {dictationInterimText}
                        </button>
                    )}

                    {dictationError && (
                        <div className={styles.dictationErrorPanel}>
                            <span>{dictationError.message}</span>
                            <div className={styles.dictationErrorActions}>
                                <button type="button" onClick={handleRetryPermissionRequest}>
                                    Retry microphone
                                </button>
                                {dictationError.code === 'permission-denied' && microphoneSettingsUrl && (
                                    <button type="button" onClick={handleOpenBrowserSettings}>
                                        Open browser settings
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {(isDictationPanelExpanded || Boolean(dictationLastFinalChunk)) && (
                        <>
                            {dictationLastFinalChunk && (
                                <div className={styles.dictationCorrectionPanel}>
                                    <label className={styles.dictationCorrectionLabel}>
                                        Edit last transcript chunk
                                    </label>
                                    <textarea
                                        className={styles.dictationCorrectionTextarea}
                                        value={dictationEditableChunk}
                                        onChange={(event) => setDictationEditableChunk(event.target.value)}
                                    />
                                    <div className={styles.dictationCorrectionActions}>
                                        <button type="button" onClick={handleApplyCorrection}>
                                            Apply correction
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBacktrackLastChunk}
                                            disabled={dictationChunks.length === 0}
                                        >
                                            Backtrack
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.dictationSettingsPanel}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.autoPunctuation}
                                        onChange={(event) =>
                                            setDictationSettings((previous) => ({
                                                ...previous,
                                                autoPunctuation: event.target.checked,
                                            }))
                                        }
                                    />
                                    Auto punctuation
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.autoCapitalization}
                                        onChange={(event) =>
                                            setDictationSettings((previous) => ({
                                                ...previous,
                                                autoCapitalization: event.target.checked,
                                            }))
                                        }
                                    />
                                    Auto capitalization
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.removeFillerWords}
                                        onChange={(event) =>
                                            setDictationSettings((previous) => ({
                                                ...previous,
                                                removeFillerWords: event.target.checked,
                                            }))
                                        }
                                    />
                                    Remove fillers (um, uh, like)
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.formatLists}
                                        onChange={(event) =>
                                            setDictationSettings((previous) => ({
                                                ...previous,
                                                formatLists: event.target.checked,
                                            }))
                                        }
                                    />
                                    Format list commands
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.whisperMode}
                                        onChange={(event) =>
                                            setDictationSettings((previous) => ({
                                                ...previous,
                                                whisperMode: event.target.checked,
                                            }))
                                        }
                                    />
                                    Whisper mode
                                </label>
                            </div>

                            <p className={styles.dictationFallbackNote}>
                                Browser fallback:{' '}
                                {isBrowserSpeechFallbackSupported
                                    ? 'available (Web Speech API)'
                                    : 'not available in this browser'}
                            </p>
                        </>
                    )}
                </section>
            )}

            {isUploading && (
                <div className={styles.uploadProgress}>
                    <div className={styles.uploadProgressBar}>
                        <div className={styles.uploadProgressFill}></div>
                    </div>
                    <span>Uploading files...</span>
                </div>
            )}

            {isDragOver && onFileUpload && (
                <div className={styles.dragOverlay}>
                    <div className={styles.dragOverlayContent}>
                        <AttachmentIcon size={48} />
                        <span>Drop files here to upload</span>
                    </div>
                </div>
            )}
        </div>
    );
}
