import type { string_language } from '../../types/string_token';
import type { BookLanguageManualDictionary } from './BookLanguageManualDictionary';
import { czechBookLanguageManualDictionary } from './czechBookLanguageManualDictionary';
import { englishBookLanguageManualDictionary } from './englishBookLanguageManualDictionary';

/**
 * All language packs of the standalone Book language manual.
 *
 * Add a new dictionary here to make the manual exportable in one more language.
 *
 * @private internal constant of `createStandaloneBookLanguageMarkdown`
 */
const BOOK_LANGUAGE_MANUAL_DICTIONARIES: ReadonlyArray<BookLanguageManualDictionary> = [
    englishBookLanguageManualDictionary,
    czechBookLanguageManualDictionary,
];

/**
 * Resolves the manual dictionary for one requested language.
 *
 * Unknown and region-qualified codes (for example `cs-CZ`) fall back to the
 * closest available pack and finally to English, so an export never fails
 * because of an unsupported language.
 *
 * @param language - Requested language code.
 * @returns Manual dictionary for the requested language or the English fallback.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export function getBookLanguageManualDictionary(
    language: string_language | null | undefined,
): BookLanguageManualDictionary {
    const normalizedLanguage = (language || '').trim().toLowerCase().split(/[-_]/)[0];

    return (
        BOOK_LANGUAGE_MANUAL_DICTIONARIES.find((dictionary) => dictionary.language === normalizedLanguage) ||
        englishBookLanguageManualDictionary
    );
}
