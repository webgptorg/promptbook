'use client';

import { useMemo } from 'react';
import { resolveSpeechRecognitionLanguage } from '../../../utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import type { ChatProps } from './ChatProps';
import {
    resolveSpeechRecognitionUiDescriptor,
    type DictationUiState,
    type SpeechRecognitionUiDescriptor,
} from './resolveSpeechRecognitionUiDescriptor';

/**
 * Props for `useChatInputAreaDictationSupport`.
 *
 * @private function of `useChatInputAreaDictation`
 */
type UseChatInputAreaDictationSupportProps = {
    readonly dictationUiState: DictationUiState;
    readonly speechRecognitionLanguage?: ChatProps['speechRecognitionLanguage'];
};

/**
 * Browser-derived metadata used by the dictation UI.
 *
 * @private function of `useChatInputAreaDictationSupport`
 */
type UseChatInputAreaDictationSupportResult = {
    readonly speechRecognitionUiDescriptor: SpeechRecognitionUiDescriptor;
    readonly resolvedSpeechRecognitionLanguage: string;
    readonly isBrowserSpeechFallbackSupported: boolean;
    readonly microphoneSettingsUrl?: string;
};

/**
 * Resolves browser-specific microphone settings URLs when available.
 *
 * @private function of `useChatInputAreaDictationSupport`
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
 * Returns whether the browser exposes the Web Speech fallback APIs.
 *
 * @private function of `useChatInputAreaDictationSupport`
 */
function resolveIsBrowserSpeechFallbackSupported(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const webSpeechWindow = window as Window & {
        readonly SpeechRecognition?: unknown;
        readonly webkitSpeechRecognition?: unknown;
    };

    return Boolean(webSpeechWindow.SpeechRecognition || webSpeechWindow.webkitSpeechRecognition);
}

/**
 * Resolves browser and language metadata derived from the current dictation UI state.
 *
 * @private function of `useChatInputAreaDictation`
 */
export function useChatInputAreaDictationSupport({
    dictationUiState,
    speechRecognitionLanguage,
}: UseChatInputAreaDictationSupportProps): UseChatInputAreaDictationSupportResult {
    const speechRecognitionUiDescriptor = useMemo(
        () => resolveSpeechRecognitionUiDescriptor(dictationUiState),
        [dictationUiState],
    );
    const resolvedSpeechRecognitionLanguage = useMemo(
        () => resolveSpeechRecognitionLanguage({ overrideLanguage: speechRecognitionLanguage }),
        [speechRecognitionLanguage],
    );
    const isBrowserSpeechFallbackSupported = useMemo(() => resolveIsBrowserSpeechFallbackSupported(), []);
    const microphoneSettingsUrl = useMemo(() => resolveMicrophoneSettingsUrl(), []);

    return {
        speechRecognitionUiDescriptor,
        resolvedSpeechRecognitionLanguage,
        isBrowserSpeechFallbackSupported,
        microphoneSettingsUrl,
    };
}
