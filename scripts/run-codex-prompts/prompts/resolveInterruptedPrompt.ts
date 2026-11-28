import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { buildPromptLabel } from './buildPromptLabel';
import { listPromptsByStatus } from './listPromptsByStatus';
import type { PromptFile } from './types/PromptFile';
import type { PromptSelection } from './types/PromptSelection';

/**
 * Resolves the one prompt which `--git-changes continue` resumes.
 *
 * A coder which was killed or crashed leaves exactly one prompt behind in the in-progress `[^]` status,
 * so anything else means the working tree changes cannot be attributed to a single interrupted prompt.
 */
export function resolveInterruptedPrompt(files: PromptFile[]): PromptSelection {
    const interruptedPrompts = listPromptsByStatus(files, 'in-progress');

    if (interruptedPrompts.length === 0) {
        throw new NotFoundError(
            spaceTrim(`
                Flag \`--git-changes continue\` found no interrupted prompt to continue.

                Continuing resumes the prompt an earlier coder left in the middle of its implementation, which is the
                one marked with the in-progress \`[^]\` status. No prompt carries that status right now.

                Use \`--git-changes ignore\` to start the next \`[ ]\` prompt with the current working tree changes
                left in place, or \`--git-changes fail\` to commit or stash them first.
            `),
        );
    }

    if (interruptedPrompts.length > 1) {
        throw new NotAllowed(
            spaceTrim(
                (block) => `
                    Flag \`--git-changes continue\` found ${interruptedPrompts.length} interrupted prompts, but it can
                    continue only one.

                    The working tree changes cannot be attributed to a single prompt while more than one of them carries
                    the in-progress \`[^]\` status. Resolve the extra ones by marking them \`[x]\`, \`[!]\` or \`[ ]\`
                    and run the coder again.

                    Interrupted prompts:
                    ${block(
                        interruptedPrompts
                            .map(({ file, section }) => `- \`${buildPromptLabel(file, section)}\``)
                            .join('\n'),
                    )}
                `,
            ),
        );
    }

    return interruptedPrompts[0]!;
}
