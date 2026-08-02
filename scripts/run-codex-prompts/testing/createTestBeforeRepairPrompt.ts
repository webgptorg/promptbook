import { readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';
import { addCoderPrompt } from '../../../src/cli/cli-commands/coder/add';
import { parsePromptFile } from '../prompts/parsePromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { limitTestOutput } from './limitTestOutput';

/**
 * Creates the one queue prompt used to repair a pre-existing test failure.
 */
export async function createTestBeforeRepairPrompt(options: {
    readonly projectPath: string;
    readonly testCommand: string;
    readonly testOutput: string;
}): Promise<PromptSelection> {
    const description = spaceTrim(
        (block) => `
            Fix the existing test failures before implementing any queued coding tasks.

            The verification command \`${
                options.testCommand
            }\` failed before coding started. Fix the underlying failure without weakening or removing the tests, and leave the project ready for the remaining coding prompts.

            ## Verification output

            \`\`\`
            ${block(limitTestOutput(options.testOutput))}
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
                The pre-coding test repair prompt was created at \`${createdPrompt.filePath}\` without a runnable section.
            `),
        );
    }

    return { file: promptFile, section };
}
