import colors from 'colors';
import { AGENT_CODING_FILE_PATH } from './agentCodingFile';
import { AGENTS_FILE_PATH } from './agentsFile';
import type { InitializationStatus } from './boilerplateTemplates';
import { formatDisplayPath } from './formatDisplayPath';
import type { CoderInitializationSummary } from './initializeCoderProjectConfiguration';

/**
 * Prints a readable summary of what was initialized for the user.
 *
 * @private function of `coder init` command
 */
export function printInitializationSummary(summary: CoderInitializationSummary): void {
    console.info(colors.green('Promptbook coder configuration initialized.'));
    printInitializationStatusLine('prompts/', summary.promptsDirectoryStatus);
    printInitializationStatusLine('prompts/done/', summary.promptsDoneDirectoryStatus);
    printInitializationStatusLine('prompts/templates/', summary.promptsTemplatesDirectoryStatus);

    for (const templateFileStatus of summary.promptTemplateFileStatuses) {
        printInitializationStatusLine(formatDisplayPath(templateFileStatus.relativeFilePath), templateFileStatus.status);
    }

    printInitializationStatusLine(AGENTS_FILE_PATH, summary.agentsFileStatus);
    printInitializationStatusLine(AGENT_CODING_FILE_PATH, summary.agentCodingFileStatus);
    printInitializationStatusLine('.env', summary.envFileStatus);
    printInitializationStatusLine('.gitignore', summary.gitignoreFileStatus);
    printInitializationStatusLine('package.json', summary.packageJsonFileStatus);
    printInitializationStatusLine('.vscode/settings.json', summary.vscodeSettingsFileStatus);

    if (summary.initializedEnvVariableNames.length > 0) {
        printInitializationNote(`Added env variables: ${summary.initializedEnvVariableNames.join(', ')}`, colors.cyan);
    } else {
        printInitializationNote('Required coder env variables are already present.', colors.gray);
    }
}

/**
 * Formats one initialization status into a human-readable label.
 */
function formatInitializationStatus(status: InitializationStatus): string {
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
function printInitializationStatusLine(relativePath: string, status: InitializationStatus): void {
    console.info(colors.gray(`✔ ${relativePath}: ${formatInitializationStatus(status)}`));
}

/**
 * Prints one checked initialization note.
 */
function printInitializationNote(message: string, colorize: (message: string) => string): void {
    console.info(colorize(`✔ ${message}`));
}

// Note: [🟡] Code for coder init summary printing [printInitializationSummary](src/cli/cli-commands/coder/printInitializationSummary.ts) should never be published outside of `@promptbook/cli`
