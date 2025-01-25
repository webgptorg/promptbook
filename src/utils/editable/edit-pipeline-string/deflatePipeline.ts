import spaceTrim from 'spacetrim';
import { DEFAULT_BOOK_OUTPUT_PARAMETER_NAME } from '../../../config';
import { DEFAULT_BOOK_TITLE } from '../../../config';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { validatePipelineString } from '../../../pipeline/validatePipelineString';
import type { string_prompt } from '../../../types/typeAliases';
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
    const potentialReturnStatement = pipelineStringLines.pop()!;
    let returnStatement: string;

    if (/(-|=)>\s*\{.*\}/.test(potentialReturnStatement)) {
        // Note: Last line is return statement
        returnStatement = potentialReturnStatement;
    } else {
        // Note: Last line is not a return statement
        returnStatement = `-> {${DEFAULT_BOOK_OUTPUT_PARAMETER_NAME}}`;
        pipelineStringLines.push(potentialReturnStatement);
    }

    const prompt = spaceTrim(pipelineStringLines.join('\n'));

    let quotedPrompt: string_prompt;

    if (prompt.split('\n').length <= 1) {
        quotedPrompt = `> ${prompt}`;
    } else {
        quotedPrompt = spaceTrim(
            (block) => `
                \`\`\`
                ${block(prompt.split('`').join('\\`'))}
                \`\`\`
            `,
        );
    }

    pipelineString = validatePipelineString(
        spaceTrim(
            (block) => `
                # ${DEFAULT_BOOK_TITLE}

                ## Prompt

                ${block(quotedPrompt)}

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
