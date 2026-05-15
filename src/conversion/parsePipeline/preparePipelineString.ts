import { spaceTrim } from 'spacetrim';
import type { $PipelineJson } from '../../commands/_common/types/CommandParser';
import { ParseError } from '../../errors/ParseError';
import type { PipelineString } from '../../pipeline/PipelineString';
import { validatePipelineString } from '../../pipeline/validatePipelineString';
import { deflatePipeline } from '../../utils/editable/edit-pipeline-string/deflatePipeline';
import { flattenMarkdown } from '../../utils/markdown/flattenMarkdown';
import { removeMarkdownComments } from '../../utils/markdown/removeMarkdownComments';
import { getPipelineIdentification } from './getPipelineIdentification';

/**
 * Normalizes inline parameter mentions wrapped in code spans before markdown flattening.
 *
 * @private internal utility of `preparePipelineString`
 */
const INLINE_CODE_PARAMETER_REGEXP = /`\{(?<parameterName>[a-z0-9_]+)\}`/gi;

/**
 * Normalizes inline return statements wrapped in code spans before markdown flattening.
 *
 * @private internal utility of `preparePipelineString`
 */
const INLINE_CODE_RETURN_PARAMETER_REGEXP = /`->\s+\{(?<parameterName>[a-z0-9_]+)\}`/gi;

/**
 * Removes shebang/comments and normalizes markdown into a parseable pipeline form.
 *
 * @private internal utility of `parsePipeline`
 */
export function preparePipelineString(pipelineString: PipelineString, $pipelineJson: $PipelineJson): PipelineString {
    pipelineString = removePipelineShebang(pipelineString, $pipelineJson);
    pipelineString = removeMarkdownComments(pipelineString);
    pipelineString = spaceTrim(pipelineString) as PipelineString;

    // <- TODO: [😧] `spaceTrim` should preserve discriminated type *(or at lease `PipelineString`)*
    pipelineString = deflatePipeline(pipelineString);
    pipelineString = flattenMarkdown(pipelineString) as PipelineString;
    pipelineString = pipelineString.replaceAll(INLINE_CODE_PARAMETER_REGEXP, '{$<parameterName>}') as PipelineString;
    pipelineString = pipelineString.replaceAll(
        INLINE_CODE_RETURN_PARAMETER_REGEXP,
        '-> {$<parameterName>}',
    ) as PipelineString;

    return pipelineString;
}

/**
 * Validates and removes the optional `#!` shebang line for `.book` files.
 *
 * @private internal utility of `preparePipelineString`
 */
function removePipelineShebang(pipelineString: PipelineString, $pipelineJson: $PipelineJson): PipelineString {
    if (!pipelineString.startsWith('#!')) {
        return pipelineString;
    }

    const [shebangLine, ...restLines] = pipelineString.split(/\r?\n/);
    const isBookShebang = (shebangLine || '').includes('ptbk');

    if (!isBookShebang) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    It seems that you try to parse a book file which has non-standard shebang line for book files:
                    Shebang line must contain 'ptbk'

                    You have:
                    ${block(shebangLine || '(empty line)')}

                    It should look like this:
                    #!/usr/bin/env ptbk

                    ${block(getPipelineIdentification($pipelineJson))}
                `,
            ),
        );
    }

    return validatePipelineString(restLines.join('\n'));
}
