import spaceTrim from 'spacetrim';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { removeMarkdownComments } from '../../markdown/removeMarkdownComments';

/**
 * Utility to determine if a pipeline string is in flat format.
 * A flat pipeline is a simple text without proper structure (headers, blocks, etc).
 *
 * @public exported from `@promptbook/editable`
 */
export function isFlatPipeline(pipelineString: PipelineString): boolean {
    pipelineString = removeMarkdownComments(pipelineString);
    pipelineString = spaceTrim(pipelineString) as PipelineString;

    const isMarkdownBeginningWithHeadline = pipelineString.startsWith('# ');
    //const isLastLineReturnStatement = pipelineString.split(/\r?\n/).pop()!.split('`').join('').startsWith('->');

    const isBacktickBlockUsed = pipelineString.includes('```');
    const isQuoteBlocksUsed = /^>\s+/m.test(pipelineString);
    const isBlocksUsed = isBacktickBlockUsed || isQuoteBlocksUsed;

    // TODO: [🧉] Also (double)check
    // > const usedCommands
    // > const isBlocksUsed
    // > const returnStatementCount

    const isFlat = !isMarkdownBeginningWithHeadline && !isBlocksUsed; /* && isLastLineReturnStatement */

    return isFlat;
}
