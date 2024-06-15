import {
    countCharacters,
    countLines,
    countPages,
    countParagraphs,
    countSentences,
    countWords,
} from '../_packages/utils.index';
import { PromptResultUsageCounts } from './PromptResult';

/**
 * Helper of usage compute
 *
 * @param content the content of prompt or response
 * @returns part of PromptResultUsageCounts
 *
 * @private internal util of LlmExecutionTools
 */
export function computeUsageCounts(content: string): Omit<PromptResultUsageCounts, 'tokensCount'> {
    return {
        charactersCount: { value: countCharacters(content) },
        wordsCount: { value: countWords(content) },
        sentencesCount: { value: countSentences(content) },
        linesCount: { value: countLines(content) },
        paragraphsCount: { value: countParagraphs(content) },
        pagesCount: { value: countPages(content) },
    };
}
