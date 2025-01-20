import spaceTrim from 'spacetrim';
import { DEFAULT_BOOK_TITLE } from '../../../config';
import { PipelineString } from '../../../pipeline/PipelineString';
import { validatePipelineString } from '../../../pipeline/validatePipelineString';
import { isFlatPipeline } from '../utils/isFlatPipeline';

/**
 * @@@
 *
 * @public exported from `@promptbook/editable`
 */
export function deflatePipeline(pipelineString: PipelineString): PipelineString {
    if (!isFlatPipeline(pipelineString)) {
        return pipelineString;
    }

    const pipelineStringLines = pipelineString.split('\n');
    const returnStatement = pipelineStringLines.pop()!;
    const prompt = spaceTrim(pipelineStringLines.join('\n'));
    pipelineString = validatePipelineString(
        spaceTrim(
            (block) => `
                # ${DEFAULT_BOOK_TITLE}

                ## Prompt

                \`\`\`
                ${block(prompt)}
                \`\`\`

                ${returnStatement}
            `,
        ),
    );
    // <- TODO: Maybe use book` notation

    return pipelineString;
}

/**
 * TODO: Unit test
 */
