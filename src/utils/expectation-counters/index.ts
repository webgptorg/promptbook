import type { ExpectationAmount, ExpectationUnit } from '../../pipeline/PipelineJson/Expectations';
import { countCharacters } from './countCharacters';
import { countLines } from './countLines';
import { countPages } from './countPages';
import { countParagraphs } from './countParagraphs';
import { countSentences } from './countSentences';
import { countWords } from './countWords';

/**
 * Index of all counter functions
 *
 * @public exported from `@promptbook/utils`
 */
export const CountUtils: Record<ExpectationUnit, (text: string) => ExpectationAmount> = {
    CHARACTERS: countCharacters,
    WORDS: countWords,
    SENTENCES: countSentences,
    PARAGRAPHS: countParagraphs,
    LINES: countLines,
    PAGES: countPages,
};

/**
 * TODO: [🧠][🤠] This should be probbably as part of `TextFormatParser`
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
