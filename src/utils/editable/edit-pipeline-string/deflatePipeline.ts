import spaceTrim from 'spacetrim';
import { padBook } from '../../../book-2.0/agent-source/padBook';
import { DEFAULT_BOOK_OUTPUT_PARAMETER_NAME, DEFAULT_BOOK_TITLE } from '../../../config';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { validatePipelineString } from '../../../pipeline/validatePipelineString';
import type { string_prompt } from '../../../types/typeAliases';
import { really_any } from '../../organization/really_any';
import { isFlatPipeline } from '../utils/isFlatPipeline';

/**
 * Converts a pipeline structure to its string representation.
 *
 * Transforms a flat, simple pipeline into a properly formatted pipeline string
 * with sections for title, prompt, and return statement.
 *
 * @public exported from `@promptbook/editable`
 */
export function deflatePipeline(pipelineString: PipelineString): PipelineString {
    if (!isFlatPipeline(pipelineString)) {
        return pipelineString;
    }

    pipelineString = spaceTrim(pipelineString) as PipelineString;

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

    return padBook(pipelineString as really_any) as really_any as PipelineString;
}

/**
 * TODO: Unit test
 */
