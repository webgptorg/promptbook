import { countCharacters } from '../../utils/expectation-counters/countCharacters';
import { countLines } from '../../utils/expectation-counters/countLines';
import { countPages } from '../../utils/expectation-counters/countPages';
import { countParagraphs } from '../../utils/expectation-counters/countParagraphs';
import { countSentences } from '../../utils/expectation-counters/countSentences';
import { countWords } from '../../utils/expectation-counters/countWords';
import type { PromptResultUsageCounts } from '../PromptResultUsage';

/**
 * Helper of usage compute
 *
 * @param content the content of prompt or response
 * @returns part of PromptResultUsageCounts
 *
 * @private internal utility of LlmExecutionTools
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
