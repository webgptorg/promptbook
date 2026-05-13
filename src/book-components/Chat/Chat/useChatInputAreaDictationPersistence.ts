'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { DictationDictionary, DictationRefinementSettings } from './refineFinalDictationChunk';
import { DEFAULT_DICTATION_SETTINGS } from './refineFinalDictationChunk';

/**
 * Key used to persist dictation refinement preferences.
 *
 * @private function of `useChatInputAreaDictationPersistence`
 */
const DICTATION_PREFERENCES_STORAGE_KEY = 'promptbook-chat-dictation-preferences';

/**
 * Key used to persist the user speech-correction dictionary.
 *
 * @private function of `useChatInputAreaDictationPersistence`
 */
const DICTATION_DICTIONARY_STORAGE_KEY = 'promptbook-chat-dictation-dictionary';

/**
 * Persistent dictation state shared by the dictation hook and its helpers.
 *
 * @private function of `useChatInputAreaDictationPersistence`
 */
type UseChatInputAreaDictationPersistenceResult = {
    readonly dictationSettings: DictationRefinementSettings;
    readonly setDictationSettings: Dispatch<SetStateAction<DictationRefinementSettings>>;
    readonly dictationDictionary: DictationDictionary;
    readonly setDictationDictionary: Dispatch<SetStateAction<DictationDictionary>>;
};

/**
 * Safely loads dictation preferences from local storage.
 *
 * @private function of `useChatInputAreaDictationPersistence`
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
 * Safely loads the learned dictation dictionary from local storage.
 *
 * @private function of `useChatInputAreaDictationPersistence`
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
 * @private function of `useChatInputAreaDictationPersistence`
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
 * Persists the learned dictation dictionary.
 *
 * @private function of `useChatInputAreaDictationPersistence`
 */
function saveDictationDictionary(value: DictationDictionary): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(DICTATION_DICTIONARY_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Persisting the dictionary is best-effort.
    }
}

/**
 * Manages local-storage-backed dictation preferences and the learned dictionary.
 *
 * @private function of `useChatInputAreaDictation`
 */
export function useChatInputAreaDictationPersistence(): UseChatInputAreaDictationPersistenceResult {
    const [dictationSettings, setDictationSettings] = useState<DictationRefinementSettings>(() =>
        loadDictationPreferences(),
    );
    const [dictationDictionary, setDictationDictionary] = useState<DictationDictionary>(() =>
        loadDictationDictionary(),
    );

    useEffect(() => {
        saveDictationPreferences(dictationSettings);
    }, [dictationSettings]);

    useEffect(() => {
        saveDictationDictionary(dictationDictionary);
    }, [dictationDictionary]);

    return {
        dictationSettings,
        setDictationSettings,
        dictationDictionary,
        setDictationDictionary,
    };
}
