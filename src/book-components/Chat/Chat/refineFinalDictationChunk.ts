/**
 * Voice settings available for lightweight transcript refinement.
 *
 * @private function of `useChatInputAreaDictation`
 */
export type DictationRefinementSettings = {
    readonly autoPunctuation: boolean;
    readonly autoCapitalization: boolean;
    readonly removeFillerWords: boolean;
    readonly formatLists: boolean;
    readonly whisperMode: boolean;
};

/**
 * Dictionary map of corrected lower-case token to preferred token.
 *
 * @private function of `useChatInputAreaDictation`
 */
export type DictationDictionary = Readonly<Record<string, string>>;

/**
 * Fallback refinement settings when user has no saved preferences.
 *
 * @private function of `useChatInputAreaDictation`
 */
export const DEFAULT_DICTATION_SETTINGS: DictationRefinementSettings = {
    autoPunctuation: true,
    autoCapitalization: true,
    removeFillerWords: false,
    formatLists: true,
    whisperMode: false,
};

/**
 * Escape helper for dynamic RegExp creation.
 *
 * @private function of `refineFinalDictationChunk`
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes free-form transcript whitespace.
 *
 * @private function of `useChatInputAreaDictation`
 */
export function normalizeDictationWhitespace(text: string): string {
    return text
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();
}

/**
 * Applies learned dictionary replacements to one transcript chunk.
 *
 * @private function of `refineFinalDictationChunk`
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
 * @private function of `refineFinalDictationChunk`
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
 * @private function of `refineFinalDictationChunk`
 */
function removeDictationFillers(text: string): string {
    const stripped = text.replace(/\b(um+|uh+|like)\b/gi, '');
    return normalizeDictationWhitespace(stripped);
}

/**
 * Capitalizes sentence starts in one transcript chunk.
 *
 * @private function of `refineFinalDictationChunk`
 */
function autoCapitalizeDictationText(text: string): string {
    return text.replace(/(^|[\n.!?]\s*)([a-z])/g, (_match, prefix: string, letter: string) => {
        return `${prefix}${letter.toUpperCase()}`;
    });
}

/**
 * Ensures a final dictated chunk ends with punctuation when appropriate.
 *
 * @private function of `refineFinalDictationChunk`
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
export function refineFinalDictationChunk(
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
