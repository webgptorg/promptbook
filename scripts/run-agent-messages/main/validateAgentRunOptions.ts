import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { PROMPT_RUNNER_HARNESS_OPTION_HINT } from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import type { AgentRunOptions } from '../AgentRunOptions';

/**
 * Validates cross-flag constraints for `ptbk agent-folder` runs.
 */
export function validateAgentRunOptions(options: AgentRunOptions): void {
    if (!options.agentName) {
        throw new NotAllowed(`You must choose a harness using ${PROMPT_RUNNER_HARNESS_OPTION_HINT}.`);
    }

    if (options.autoPull && options.noCommit) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--auto-pull\` requires commits, so it cannot be combined with \`--no-commit\`.

                Auto-pull keeps the repository up to date between message rounds, which requires each answered message to end in a committed state.
            `),
        );
    }
}
