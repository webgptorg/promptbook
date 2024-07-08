import type { ExpectationAmount } from '../../types/PipelineJson/PromptTemplateJson';
import type { ExpectationUnit } from '../../types/PipelineJson/PromptTemplateJson';
import { countCharacters } from './countCharacters';
import { countLines } from './countLines';
import { countPages } from './countPages';
import { countParagraphs } from './countParagraphs';
import { countSentences } from './countSentences';
import { countWords } from './countWords';

/**
 * Index of all counter functions
 */
export const CountUtils: Record<ExpectationUnit, (text: string) => ExpectationAmount> = {
    CHARACTERS: countCharacters,
    WORDS: countWords,
    SENTENCES: countSentences,
    PARAGRAPHS: countParagraphs,
    LINES: countLines,
    PAGES: countPages,
};
