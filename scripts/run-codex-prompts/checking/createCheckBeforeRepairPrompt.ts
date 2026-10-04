import { readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';
import { addCoderPrompt } from '../../../src/cli/cli-commands/coder/add';
import { parsePromptFile } from '../prompts/parsePromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { limitCheckOutput } from './limitCheckOutput';

/**
 * Creates the one queue prompt used to repair a pre-existing aggregate check failure.
 */
export async function createCheckBeforeRepairPrompt(options: {
    readonly projectPath: string;
    readonly checkCommand: string;
    readonly checkOutput: string;
}): Promise<PromptSelection> {
    const description = spaceTrim(
        (block) => `
            Fix the existing project check failures before implementing any queued coding tasks.

            The check command \`${options.checkCommand}\` failed before coding started. Fix the underlying lint, type,
            build, generated-code, or test failure without weakening the project's validation, and leave the project
            ready for the remaining coding prompts.

            Do not delete assertions, disable lint rules, remove failing checks from the aggregate command, lower
            quality thresholds, skip a build, or force the command to exit successfully. Preserve the project's
            validation coverage while fixing the underlying cause.

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
