import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { AGENT_CODING_FILE_PATH } from './agentCodingFile';
import { AGENTS_FILE_PATH } from './agentsFile';
import { getDefaultCoderProjectPromptTemplateDefinitions } from './boilerplateTemplates';
import { formatDisplayPath } from './formatDisplayPath';
import { initializeCoderProjectConfiguration } from './initializeCoderProjectConfiguration';
import { printInitializationSummary } from './printInitializationSummary';

export { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
export { getDefaultCoderVscodeSettings } from './getDefaultCoderVscodeSettings';
export { initializeCoderProjectConfiguration } from './initializeCoderProjectConfiguration';

/**
 * Initializes `coder init` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderInitCommand(program: Program): $side_effect {
    const command = program.command('init');
    command.alias('initialize');
    command.description(
        spaceTrim(`
            Initialize Promptbook coder configuration for current project

            Creates or updates:
            - prompts/
            - prompts/done/
            ${listDefaultCoderProjectPromptTemplateDisplayPaths()}
            - ${AGENTS_FILE_PATH}
            - ${AGENT_CODING_FILE_PATH}
            - .gitignore
            - package.json
            - .vscode/settings.json

            Ensures required coding-agent environment variables in .env:
            - CODING_AGENT_GIT_NAME
            - CODING_AGENT_GIT_EMAIL
            - CODING_AGENT_GIT_SIGNING_KEY
        `),
    );

    command.action(
        handleActionErrors(async () => {
            const summary = await initializeCoderProjectConfiguration(process.cwd());
            printInitializationSummary(summary);
        }),
    );
}

/**
 * Lists the project-owned template file paths created by `ptbk coder init`.
 */
function listDefaultCoderProjectPromptTemplateDisplayPaths(): string {
    return getDefaultCoderProjectPromptTemplateDefinitions()
        .map(({ relativeFilePath }) => `- ${formatDisplayPath(relativeFilePath)}`)
        .join('\n');
}

// Note: [🟡] Code for CLI command [init](src/cli/cli-commands/coder/init.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
