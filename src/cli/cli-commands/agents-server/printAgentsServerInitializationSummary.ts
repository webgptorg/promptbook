import colors from 'colors';
import type { ProjectInitializationStatus } from '../common/projectInitialization';
import type { AgentsServerInitializationSummary } from './initializeAgentsServerProjectConfiguration';

/**
 * Prints a readable summary of local Agents Server configuration initialization.
 *
 * @private internal utility of `ptbk agents-server init`
 */
export function printAgentsServerInitializationSummary(summary: AgentsServerInitializationSummary): void {
    console.info(colors.green('Promptbook Agents Server configuration initialized.'));
    printInitializationStatusLine('.env', summary.envFileStatus);
    printInitializationStatusLine('.gitignore', summary.gitignoreFileStatus);

    if (summary.initializedEnvVariableNames.length > 0) {
        console.info(colors.cyan(`✔ Added env variables: ${summary.initializedEnvVariableNames.join(', ')}`));
        return;
    }

    console.info(colors.gray('✔ Required Agents Server env variables are already present.'));
}

/**
 * Formats one project initialization status into a human-readable label.
 */
function formatInitializationStatus(status: ProjectInitializationStatus): string {
    if (status === 'created') {
        return 'created';
    }

    if (status === 'updated') {
        return 'updated';
    }

    return 'unchanged';
}

/**
 * Prints one checked initialization-status line.
 */
function printInitializationStatusLine(relativePath: string, status: ProjectInitializationStatus): void {
    console.info(colors.gray(`✔ ${relativePath}: ${formatInitializationStatus(status)}`));
}

// Note: [🟡] Code for Agents Server init summary [printAgentsServerInitializationSummary](src/cli/cli-commands/agents-server/printAgentsServerInitializationSummary.ts) should never be published outside of `@promptbook/cli`
