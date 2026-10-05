import { readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';
import { addCoderPrompt } from '../../../src/cli/cli-commands/coder/add';
import { parsePromptFile } from '../prompts/parsePromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { limitCheckOutput } from './limitCheckOutput';
import { CHECK_REPAIR_INSTRUCTIONS } from './checkRepairInstructions';
import { getSafeCodeBlock } from '../../../src/book-2.0/book-language-documentation/getSafeCodeBlock';

/**
 * Creates one explicitly selected PRD to repair a pre-existing project check failure.
 */
export async function createCheckBeforeRepairPrompt(options: {
    readonly projectPath: string;
    readonly checkCommand: string;
    readonly checkOutput: string;
    /** Run may return to its queue after this repair; fix must exit after repairing only these failures. */
    readonly intent?: 'run' | 'fix';
}): Promise<PromptSelection> {
    const isFixOnly = options.intent === 'fix';
    const description = spaceTrim(
        (block) => `
            ${
                isFixOnly
                    ? 'Fix the existing project check failures only.'
                    : 'Fix the existing check failures before implementing any queued coding tasks.'
            }

            The check command \`${options.checkCommand}\` failed before coding started. ${
            isFixOnly
                ? 'Verify the correction with this exact command and stop after the repair.'
                : 'Leave the project ready for the remaining coding prompts.'
        }

            <!-- ptbk-coder-check-repair -->

            Fix only the underlying check defects. Do not execute, edit, archive, mark, or change the priority of any other PRD.
            Do not add unrelated features, perform opportunistic cleanup, or change intended project behavior just to obtain a pass.
            Correct faulty check or test code only when the correction preserves its intended validation; explain the defect.

            ${block(CHECK_REPAIR_INSTRUCTIONS)}

            ## Check output

            ${block(getSafeCodeBlock(limitCheckOutput(options.checkOutput)))}
        `,
    );
    const createdPrompt = await addCoderPrompt({
        projectPath: options.projectPath,
        description,
        priority: 0,
        promptTemplate: { identifier: 'check-repair', content: '', slugPrefix: null },
    });
    const promptPath = join(options.projectPath, createdPrompt.filePath);
    const promptFile = parsePromptFile(promptPath, await readFile(promptPath, 'utf-8'));
    const section = promptFile.sections[0];

    if (!section) {
        throw new UnexpectedError(
            spaceTrim(`
                The pre-coding check repair prompt was created at \`${createdPrompt.filePath}\` without a runnable section.
            `),
        );
    }

    return { file: promptFile, section };
}
