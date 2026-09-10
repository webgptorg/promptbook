import colors from 'colors';
import type { InitializationStatus } from './boilerplateTemplates';
import type { CoderReferencedArtifactStatus } from './coderReferencedArtifacts';
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
    printInitializationStatusLine('agents/', summary.agentsDirectoryStatus);
    printInitializationStatusLine('.env', summary.envFileStatus);
    printInitializationStatusLine('.gitignore', summary.gitignoreFileStatus);
    printInitializationStatusLine('package.json', summary.packageJsonFileStatus);
    printInitializationStatusLine('.vscode/settings.json', summary.vscodeSettingsFileStatus);

    for (const referencedArtifactStatus of summary.referencedArtifactStatuses) {
        printInitializationStatusLine(
            formatDisplayPath(referencedArtifactStatus.relativeFilePath),
            referencedArtifactStatus.status,
        );
    }

    if (summary.addedPackageJsonScriptNames.length > 0) {
        printInitializationNote(`Added npm scripts: ${summary.addedPackageJsonScriptNames.join(', ')}`, colors.cyan);
    } else {
        printInitializationNote('All Promptbook coder npm scripts are already present.', colors.gray);
    }

    if (summary.initializedEnvVariableNames.length > 0) {
        printInitializationNote(`Added env variables: ${summary.initializedEnvVariableNames.join(', ')}`, colors.cyan);
    } else {
        printInitializationNote('Required coder env variables are already present.', colors.gray);
    }
}

/**
 * Formats one initialization status into a human-readable label.
 */
function formatInitializationStatus(status: InitializationStatus | CoderReferencedArtifactStatus): string {
    if (status === 'created') {
        return 'created';
    }

    if (status === 'updated') {
        return 'updated';
    }

    if (status === 'not-referenced') {
        return 'not referenced by the added scripts, kept as is';
    }

    return 'unchanged';
}

/**
 * Prints one checked initialization-status line.
 */
function printInitializationStatusLine(
    relativePath: string,
    status: InitializationStatus | CoderReferencedArtifactStatus,
): void {
    console.info(colors.gray(`✔ ${relativePath}: ${formatInitializationStatus(status)}`));
}

/**
 * Prints one checked initialization note.
 */
function printInitializationNote(message: string, colorize: (message: string) => string): void {
    console.info(colorize(`✔ ${message}`));
}

// Note: [🟡] Code for coder init summary printing [printInitializationSummary](src/cli/cli-commands/coder/printInitializationSummary.ts) should never be published outside of `@promptbook/cli`
