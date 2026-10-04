import { readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';
import { addCoderPrompt } from '../../../src/cli/cli-commands/coder/add';
import { parsePromptFile } from '../prompts/parsePromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { limitCheckOutput } from './limitCheckOutput';
import { CHECK_REPAIR_INSTRUCTIONS } from './checkRepairInstructions';

/**
 * Creates the one queue prompt used to repair a pre-existing project check failure.
 */
export async function createCheckBeforeRepairPrompt(options: {
    readonly projectPath: string;
    readonly checkCommand: string;
    readonly checkOutput: string;
}): Promise<PromptSelection> {
    const description = spaceTrim(
        (block) => `
            Fix the existing check failures before implementing any queued coding tasks.

            The check command \`${
                options.checkCommand
            }\` failed before coding started. Leave the project ready for the remaining coding prompts.

            ${block(CHECK_REPAIR_INSTRUCTIONS)}

            ## Check output

            \`\`\`
            ${block(limitCheckOutput(options.checkOutput))}
            \`\`\`
        `,
    );
    const createdPrompt = await addCoderPrompt({
        projectPath: options.projectPath,
        description,
        priority: 0,
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
