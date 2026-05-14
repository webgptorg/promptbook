import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { AgentRunOptions } from '../AgentRunOptions';

/**
 * Validates constraints specific to never-ending agent watch loops.
 */
export function validateAgentWatchOptions(commandDisplayName: string, options: AgentRunOptions): void {
    if (!options.noCommit || options.ignoreGitChanges) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Flag \`--no-commit\` requires \`--ignore-git-changes\` when used with \`${commandDisplayName}\`.

            Without commits, answered messages remain in the working tree and the next message round would fail the clean
            working tree check.
        `),
    );
}
