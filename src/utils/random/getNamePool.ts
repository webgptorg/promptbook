import { CzechNamePool } from './CzechNamePool';
import { EnglishNamePool } from './EnglishNamePool';
import type { NamePool } from './NamePool';

/**
 * Gets the name pool based on the language code
 *
 * @param language - The language code (e.g. 'ENGLISH', 'CZECH')
 * @returns The name pool
 *
 * @private [🍇] Maybe expose via some package
 */
export function getNamePool(language: string): NamePool {
    const normalizedLanguage = language.toUpperCase().trim();

    if (normalizedLanguage === 'CZECH' || normalizedLanguage === 'CS') {
        return CzechNamePool;
    }

    // Default to English
    return EnglishNamePool;
}
