import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import {
    ensureDefaultCoderPromptTemplateFiles,
    type EnsuredCoderPromptTemplateFile,
    type InitializationStatus,
    PROMPTS_DIRECTORY_PATH,
    PROMPTS_DONE_DIRECTORY_PATH,
    PROMPTS_TEMPLATES_DIRECTORY_PATH,
} from './boilerplateTemplates';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Shape of one required coder environment variable with its default value.
 */
type RequiredCoderEnvVariable = {
    readonly name: string;
    readonly value: string;
};

/**
 * Required environment variables for coding-agent git identity.
 */
const REQUIRED_CODER_ENV_VARIABLES: ReadonlyArray<RequiredCoderEnvVariable> = [
    {
        name: 'CODING_AGENT_GIT_NAME',
        value: 'Promptbook Coding Agent',
    },
    {
        name: 'CODING_AGENT_GIT_EMAIL',
        value: 'coding-agent@promptbook.studio',
    },
    {
        name: 'CODING_AGENT_GIT_SIGNING_KEY',
        value: '13406525ED912F938FEA85AB4046C687298B2382',
    },
];

/**
 * Result summary returned after coder configuration initialization.
 */
type CoderInitializationSummary = {
    readonly promptsDirectoryStatus: InitializationStatus;
    readonly promptsDoneDirectoryStatus: InitializationStatus;
    readonly promptsTemplatesDirectoryStatus: InitializationStatus;
    readonly promptTemplateFileStatuses: ReadonlyArray<EnsuredCoderPromptTemplateFile>;
    readonly envFileStatus: InitializationStatus;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
};

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

            Creates:
            - prompts/
            - prompts/done/
            - prompts/templates/common.md
            - prompts/templates/agents-server.md

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
 * Creates or updates all coder configuration artifacts required in the current project.
 *
 * @private internal utility of `coder init` command
 */
export async function initializeCoderProjectConfiguration(projectPath: string): Promise<CoderInitializationSummary> {
    const promptsDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_DIRECTORY_PATH);
    const promptsDoneDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_DONE_DIRECTORY_PATH);
    const promptsTemplatesDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_TEMPLATES_DIRECTORY_PATH);
    const promptTemplateFileStatuses = await ensureDefaultCoderPromptTemplateFiles(projectPath);
    const { envFileStatus, initializedEnvVariableNames } = await ensureCoderEnvFile(projectPath);

    return {
        promptsDirectoryStatus,
        promptsDoneDirectoryStatus,
        promptsTemplatesDirectoryStatus,
        promptTemplateFileStatuses,
        envFileStatus,
        initializedEnvVariableNames,
    };
}

/**
 * Ensures a relative directory exists in the project root.
 */
async function ensureDirectory(projectPath: string, relativeDirectoryPath: string): Promise<InitializationStatus> {
    const directoryPath = join(projectPath, relativeDirectoryPath);
    const existedBefore = await isExistingDirectory(directoryPath);

    if (!existedBefore) {
        await mkdir(directoryPath, { recursive: true });
        return 'created';
    }

    return 'unchanged';
}

/**
 * Ensures `.env` exists and contains all required coder environment variables.
 */
async function ensureCoderEnvFile(projectPath: string): Promise<{
    readonly envFileStatus: InitializationStatus;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
}> {
    const envFilePath = join(projectPath, '.env');
    const envFileExistedBefore = await isExistingFile(envFilePath);
    const currentEnvContent = envFileExistedBefore ? await readFile(envFilePath, 'utf-8') : '';
    const existingEnvVariables = parseEnvVariableNames(currentEnvContent);
    const missingEnvVariables = REQUIRED_CODER_ENV_VARIABLES.filter(({ name }) => !existingEnvVariables.has(name));

    if (missingEnvVariables.length === 0) {
        if (!envFileExistedBefore) {
            await writeFile(envFilePath, '# Environment variables for Promptbook coder\n', 'utf-8');
            return {
                envFileStatus: 'created',
                initializedEnvVariableNames: [],
            };
        }

        return {
            envFileStatus: 'unchanged',
            initializedEnvVariableNames: [],
        };
    }

    const envBlockToAppend = buildMissingEnvVariablesBlock(missingEnvVariables);
    const nextEnvContent = appendBlock(currentEnvContent, envBlockToAppend);
    await writeFile(envFilePath, nextEnvContent, 'utf-8');

    return {
        envFileStatus: envFileExistedBefore ? 'updated' : 'created',
        initializedEnvVariableNames: missingEnvVariables.map(({ name }) => name),
    };
}

/**
 * Parses variable names currently defined in `.env` style content.
 */
function parseEnvVariableNames(envContent: string): Set<string> {
    const variableNames = new Set<string>();

    for (const line of envContent.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('#')) {
            continue;
        }

        const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (!match || !match[1]) {
            continue;
        }

        variableNames.add(match[1]);
    }

    return variableNames;
}

/**
 * Builds a `.env` block containing missing coder environment variables.
 */
function buildMissingEnvVariablesBlock(variables: ReadonlyArray<RequiredCoderEnvVariable>): string {
    return spaceTrim(`
        # Promptbook coder identity (initialized by \`ptbk coder init\`)
        ${variables.map(({ name, value }) => `${name}=${JSON.stringify(value)}`).join('\n')}
    `);
}

/**
 * Appends one text block to existing file content while preserving readable newlines.
 */
function appendBlock(currentContent: string, blockToAppend: string): string {
    if (currentContent.trim() === '') {
        return `${blockToAppend}\n`;
    }

    const normalizedCurrentContent = currentContent.endsWith('\n') ? currentContent : `${currentContent}\n`;
    return `${normalizedCurrentContent}\n${blockToAppend}\n`;
}

/**
 * Prints a readable summary of what was initialized for the user.
 */
function printInitializationSummary(summary: CoderInitializationSummary): void {
    console.info(colors.green('Promptbook coder configuration initialized.'));
    console.info(colors.gray(`- prompts/: ${formatInitializationStatus(summary.promptsDirectoryStatus)}`));
    console.info(colors.gray(`- prompts/done/: ${formatInitializationStatus(summary.promptsDoneDirectoryStatus)}`));
    console.info(colors.gray(`- prompts/templates/: ${formatInitializationStatus(summary.promptsTemplatesDirectoryStatus)}`));

    for (const templateFileStatus of summary.promptTemplateFileStatuses) {
        console.info(
            colors.gray(
                `- ${templateFileStatus.relativeFilePath}: ${formatInitializationStatus(templateFileStatus.status)}`,
            ),
        );
    }

    console.info(colors.gray(`- .env: ${formatInitializationStatus(summary.envFileStatus)}`));

    if (summary.initializedEnvVariableNames.length > 0) {
        console.info(colors.cyan(`- Added env variables: ${summary.initializedEnvVariableNames.join(', ')}`));
    } else {
        console.info(colors.gray('- Required coder env variables are already present.'));
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
 * Checks whether a path exists and is a file.
 */
async function isExistingFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

/**
 * Checks whether a path exists and is a directory.
 */
async function isExistingDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

// Note: [🟡] Code for CLI command [init](src/cli/cli-commands/coder/init.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
