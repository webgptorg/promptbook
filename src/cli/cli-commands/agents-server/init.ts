import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { initializeAgentsServerProjectConfiguration } from './initializeAgentsServerProjectConfiguration';
import { printAgentsServerInitializationSummary } from './printAgentsServerInitializationSummary';

export { initializeAgentsServerProjectConfiguration } from './initializeAgentsServerProjectConfiguration';

/**
 * Initializes `agents-server init` command for Promptbook CLI utilities.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentsServerInitCommand(program: Program): $side_effect {
    const command = program.command('init');
    command.description(
        spaceTrim(`
            Initialize Promptbook Agents Server configuration for current project

            Creates or updates:
            - .env with local Agents Server configuration placeholders
            - .gitignore with local runtime exclusions
        `),
    );

    command.action(
        handleActionErrors(async () => {
            const summary = await initializeAgentsServerProjectConfiguration(process.cwd());
            printAgentsServerInitializationSummary(summary);
        }),
    );
}

// Note: [🟡] Code for CLI command [agents-server init](src/cli/cli-commands/agents-server/init.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
