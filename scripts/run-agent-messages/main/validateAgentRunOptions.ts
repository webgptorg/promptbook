import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { AgentRunOptions } from '../AgentRunOptions';

/**
 * Validates cross-flag constraints for `ptbk agent-folder` runs.
 */
export function validateAgentRunOptions(options: AgentRunOptions): void {
    if (!options.agentName) {
        throw new NotAllowed(
            'You must choose an agent using --agent <openai-codex|github-copilot|cline|claude-code|opencode|gemini>.',
        );
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
