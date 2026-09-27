import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { CODER_DEFAULT_AGENT_BOOK_PATHS, type CoderAgentRole } from './coderAgentRole';

/**
 * Commander option bag for an optional Book agent used by coder commands.
 *
 * @private internal utility of `ptbk coder`
 */
export type CoderAgentCliOptions = {
    readonly agent?: string;
};

/**
 * Description shared by coder commands which accept an agent Book.
 *
 * @private internal utility of `ptbk coder`
 */
export const CODER_AGENT_OPTION_DESCRIPTION =
    'Book agent providing persona, instructions, identity and task routing; --harness selects the coding tool and --model selects its model';

/**
 * Registers the shared `--agent` option for coder commands.
 *
 * @private internal utility of `ptbk coder`
 */
export function addCoderAgentOption(command: Program, defaultRole?: CoderAgentRole): void {
    const defaultDescription = defaultRole
        ? `Defaults to the project's ${defaultRole === 'developer' ? 'Developer' : 'Planner'} (${
              CODER_DEFAULT_AGENT_BOOK_PATHS[defaultRole]
          }); --agent overrides this Book`
        : 'No default Book filter; omitting --agent includes tasks for all agents';
    command.option('--agent <agent-book-path>', `${CODER_AGENT_OPTION_DESCRIPTION}. ${defaultDescription}`);
}

// Note: [🟡] Code for CLI coder agent options should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
