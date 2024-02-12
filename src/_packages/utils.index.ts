import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import {
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
} from '../types/execution-report/ExecutionReportStringOptions';
import { executionReportJsonToString } from '../types/execution-report/executionReportJsonToString';
import { CountUtils } from '../utils/expectation-counters';
import { countCharacters } from '../utils/expectation-counters/countCharacters';
import { countLines } from '../utils/expectation-counters/countLines';
import { countPages } from '../utils/expectation-counters/countPages';
import { countParagraphs } from '../utils/expectation-counters/countParagraphs';
import { countSentences } from '../utils/expectation-counters/countSentences';
import { countWords } from '../utils/expectation-counters/countWords';
import { isValidJsonString } from '../utils/isValidJsonString';
import { extractAllBlocksFromMarkdown } from '../utils/markdown/extractAllBlocksFromMarkdown';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { removeContentComments } from '../utils/markdown/removeContentComments';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';
import { parseNumber } from '../utils/parseNumber';
import { removeEmojis } from '../utils/removeEmojis';
import { removeQuotes } from '../utils/removeQuotes';
import { trimCodeBlock } from '../utils/trimCodeBlock';
import { trimEndOfCodeBlock } from '../utils/trimEndOfCodeBlock';
import { unwrapResult } from '../utils/unwrapResult';

export {
    CountUtils,
    ExecutionReportStringOptions,
    ExecutionReportStringOptionsDefaults,
    assertsExecutionSuccessful,
    countCharacters,
    countLines,
    countPages,
    countParagraphs,
    countSentences,
    countWords,
    executionReportJsonToString,
    extractAllBlocksFromMarkdown,
    extractAllListItemsFromMarkdown,
    extractOneBlockFromMarkdown,
    isValidJsonString,
    parseNumber,
    removeContentComments,
    removeEmojis,
    removeMarkdownFormatting,
    removeQuotes,
    trimCodeBlock,
    trimEndOfCodeBlock,
    unwrapResult,
};

/**
 * TODO: [🧠] Maybe create some indipendent package like `markdown-tools` from both here exported and @private utilities
 */
