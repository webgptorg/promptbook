import type { DictationDictionary } from './refineFinalDictationChunk';

/**
 * Maximum number of learned dictionary replacements retained in local storage.
 *
 * @private function of `learnDictationDictionary`
 */
const MAX_DICTATION_DICTIONARY_ENTRIES = 200;

/**
 * Learns correction pairs from one user-edited transcript chunk.
 *
 * @private function of `useChatInputAreaDictation`
 */
export function learnDictationDictionary(
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
