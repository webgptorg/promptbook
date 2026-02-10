/**
 * @@@
 *
 * @private function of Agents Server speech recognition language resolution, not a general-purpose header parser
 */
const DEFAULT_SPEECH_RECOGNITION_LANGUAGE = 'en-US';

/**
 * @@@
 *
 * @private function of Agents Server speech recognition language resolution, not a general-purpose header parser
 */
type ResolveSpeechRecognitionLanguageOptions = {
    /**
     * Overrides the default language resolution when provided.
     */
    readonly overrideLanguage?: string | null;

    /**
     * Optional Accept-Language header string to derive the speaker language from server-side requests.
     */
    readonly acceptLanguageHeader?: string | null;
};

/**
 * @@@
 *
 * @private function of Agents Server speech recognition language resolution, not a general-purpose header parser
 */
function normalizeLanguageCandidate(candidate?: string | null): string | undefined {
    if (!candidate) {
        return undefined;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
        return undefined;
    }

    const [language] = trimmed.split(';');
    const normalized = language!.replace(/_/g, '-').trim();

    return normalized || undefined;
}

/**
 * Parses the primary language out of an Accept-Language header value.
 *
 * @private function of Agents Server speech recognition language resolution, not a general-purpose header parser
 */
export function parseSpeechRecognitionLanguageFromAcceptLanguageHeader(header?: string | null): string | undefined {
    if (!header) {
        return undefined;
    }

    for (const entry of header.split(',')) {
        const language = normalizeLanguageCandidate(entry);
        if (language) {
            return language;
        }
    }

    return undefined;
}

/**
 * Reads the browser-reported preferred language list and returns the first valid tag.
 *
 * @private function of Agents Server speech recognition language resolution, not a general-purpose header parser
 */
export function getBrowserPreferredSpeechRecognitionLanguage(): string | undefined {
    if (typeof navigator === 'undefined') {
        return undefined;
    }

    const candidates = Array.isArray(navigator.languages) ? [...navigator.languages] : [];
    if (navigator.language) {
        candidates.push(navigator.language);
    }

    for (const candidate of candidates) {
        const language = normalizeLanguageCandidate(candidate);
        if (language) {
            return language;
        }
    }

    return undefined;
}

/**
 * Resolves a speech recognition language tag by checking an optional override, then the Accept-Language header,
 * then the browser preferences, and finally falling back to a default of `en-US`.
 *
 * @private function of Agents Server speech recognition language resolution, not a general-purpose header parser
 */
export function resolveSpeechRecognitionLanguage(options: ResolveSpeechRecognitionLanguageOptions = {}): string {
    const normalizedOverride = normalizeLanguageCandidate(options.overrideLanguage);
    if (normalizedOverride) {
        return normalizedOverride;
    }

    const headerLanguage = parseSpeechRecognitionLanguageFromAcceptLanguageHeader(options.acceptLanguageHeader);
    if (headerLanguage) {
        return headerLanguage;
    }

    const browserLanguage = getBrowserPreferredSpeechRecognitionLanguage();
    if (browserLanguage) {
        return browserLanguage;
    }

    return DEFAULT_SPEECH_RECOGNITION_LANGUAGE;
}
