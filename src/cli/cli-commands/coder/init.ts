import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../errors/ParseError';
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
 * Generic JSON object used for standalone coder configuration files.
 */
type JsonObject = Record<string, unknown>;

/**
 * Formatting preserved when rewriting one JSON file.
 */
type JsonFileFormatting = {
    readonly indentation: string;
    readonly newline: string;
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
 * Default npm scripts initialized by `ptbk coder init`.
 */
const DEFAULT_CODER_PACKAGE_JSON_SCRIPTS = {
    'coder:generate-boilerplates': 'npx ptbk coder generate-boilerplates',
    'coder:run': 'npx ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --no-wait',
    'coder:find-refactor-candidates': 'npx ptbk coder find-refactor-candidates',
    'coder:verify': 'npx ptbk coder verify',
} as const satisfies Readonly<Record<string, string>>;

/**
 * Relative path to `.gitignore` in the initialized project.
 */
const GITIGNORE_FILE_PATH = '.gitignore';

/**
 * Relative path to `package.json` in the initialized project.
 */
const PACKAGE_JSON_FILE_PATH = 'package.json';

/**
 * Relative path to the VS Code settings file initialized by `ptbk coder init`.
 */
const VSCODE_SETTINGS_FILE_PATH = '.vscode/settings.json';

/**
 * Relative path to the VS Code directory initialized by `ptbk coder init`.
 */
const VSCODE_DIRECTORY_PATH = '.vscode';

/**
 * VS Code setting key used to route pasted markdown images into prompt-specific screenshots.
 */
const MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY = 'markdown.copyFiles.destination';

/**
 * Markdown glob used for coder prompt files inside VS Code settings.
 */
const PROMPTS_MARKDOWN_FILE_GLOB = 'prompts/*md';

/**
 * Screenshot destination used for pasted prompt images inside VS Code settings.
 */
const PROMPTS_SCREENSHOT_DESTINATION = './prompts/screenshots/${documentBaseName}.png';

/**
 * Default indentation used when creating new JSON configuration files.
 */
const DEFAULT_JSON_FILE_INDENTATION = '    ';

/**
 * Default newline used when creating new JSON configuration files.
 */
const DEFAULT_JSON_FILE_NEWLINE = '\n';

/**
 * `.gitignore` block required by standalone Promptbook coder projects.
 */
const CODER_GITIGNORE_BLOCK = spaceTrim(`
    # Promptbook Coder
    /.tmp
`);

/**
 * Result summary returned after coder configuration initialization.
 */
type CoderInitializationSummary = {
    readonly promptsDirectoryStatus: InitializationStatus;
    readonly promptsDoneDirectoryStatus: InitializationStatus;
    readonly promptsTemplatesDirectoryStatus: InitializationStatus;
    readonly promptTemplateFileStatuses: ReadonlyArray<EnsuredCoderPromptTemplateFile>;
    readonly envFileStatus: InitializationStatus;
    readonly gitignoreFileStatus: InitializationStatus;
    readonly packageJsonFileStatus: InitializationStatus;
    readonly vscodeSettingsFileStatus: InitializationStatus;
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

            Creates or updates:
            - prompts/
            - prompts/done/
            - prompts/templates/common.md
            - prompts/templates/agents-server.md
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
 * Lists the default npm scripts initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export function getDefaultCoderPackageJsonScripts(): Readonly<Record<string, string>> {
    return DEFAULT_CODER_PACKAGE_JSON_SCRIPTS;
}

/**
 * Lists the default VS Code settings initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export function getDefaultCoderVscodeSettings(): Readonly<JsonObject> {
    return {
        [MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY]: {
            [PROMPTS_MARKDOWN_FILE_GLOB]: PROMPTS_SCREENSHOT_DESTINATION,
        },
    };
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
    const gitignoreFileStatus = await ensureCoderGitignoreFile(projectPath);
    const packageJsonFileStatus = await ensureCoderPackageJsonFile(projectPath);
    const vscodeSettingsFileStatus = await ensureCoderVscodeSettingsFile(projectPath);

    return {
        promptsDirectoryStatus,
        promptsDoneDirectoryStatus,
        promptsTemplatesDirectoryStatus,
        promptTemplateFileStatuses,
        envFileStatus,
        gitignoreFileStatus,
        packageJsonFileStatus,
        vscodeSettingsFileStatus,
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
 * Ensures `.gitignore` contains the standalone Promptbook coder cache entry.
 */
async function ensureCoderGitignoreFile(projectPath: string): Promise<InitializationStatus> {
    const gitignorePath = join(projectPath, GITIGNORE_FILE_PATH);
    const currentGitignoreContent = await readTextFileIfExists(gitignorePath);
    if (currentGitignoreContent !== undefined && hasTmpGitignoreRule(currentGitignoreContent)) {
        return 'unchanged';
    }

    const nextGitignoreContent = appendBlock(currentGitignoreContent || '', CODER_GITIGNORE_BLOCK);
    await writeFile(gitignorePath, nextGitignoreContent, 'utf-8');
    return currentGitignoreContent === undefined ? 'created' : 'updated';
}

/**
 * Ensures `package.json` contains the standalone Promptbook coder helper scripts.
 */
async function ensureCoderPackageJsonFile(projectPath: string): Promise<InitializationStatus> {
    const packageJsonPath = join(projectPath, PACKAGE_JSON_FILE_PATH);
    const packageJsonContent = await readTextFileIfExists(packageJsonPath);
    const formatting = detectJsonFileFormatting(packageJsonContent);
    const packageJson =
        packageJsonContent === undefined ? {} : await parseJsonObjectFile(PACKAGE_JSON_FILE_PATH, packageJsonContent);
    const scripts = getStringRecordOrDefault(packageJson['scripts'], PACKAGE_JSON_FILE_PATH, 'scripts');

    let hasChanges = packageJsonContent === undefined;
    const nextScripts = { ...scripts };
    for (const [scriptName, scriptCommand] of Object.entries(getDefaultCoderPackageJsonScripts())) {
        if (nextScripts[scriptName] !== scriptCommand) {
            nextScripts[scriptName] = scriptCommand;
            hasChanges = true;
        }
    }

    if (!hasChanges) {
        return 'unchanged';
    }

    const nextPackageJson: JsonObject = { ...packageJson };
    nextPackageJson['scripts'] = nextScripts;
    await writeFile(packageJsonPath, serializeJsonObject(nextPackageJson, formatting), 'utf-8');
    return packageJsonContent === undefined ? 'created' : 'updated';
}

/**
 * Ensures VS Code routes pasted prompt images into `prompts/screenshots`.
 */
async function ensureCoderVscodeSettingsFile(projectPath: string): Promise<InitializationStatus> {
    await mkdir(join(projectPath, VSCODE_DIRECTORY_PATH), { recursive: true });

    const vscodeSettingsPath = join(projectPath, VSCODE_SETTINGS_FILE_PATH);
    const vscodeSettingsContent = await readTextFileIfExists(vscodeSettingsPath);
    const formatting = detectJsonFileFormatting(vscodeSettingsContent);
    const vscodeSettings =
        vscodeSettingsContent === undefined
            ? {}
            : await parseJsonObjectFile(VSCODE_SETTINGS_FILE_PATH, vscodeSettingsContent);
    const markdownCopyFilesDestinations = getStringRecordOrDefault(
        vscodeSettings[MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY],
        VSCODE_SETTINGS_FILE_PATH,
        MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY,
    );

    let hasChanges = vscodeSettingsContent === undefined;
    const nextMarkdownCopyFilesDestinations = { ...markdownCopyFilesDestinations };
    if (nextMarkdownCopyFilesDestinations[PROMPTS_MARKDOWN_FILE_GLOB] !== PROMPTS_SCREENSHOT_DESTINATION) {
        nextMarkdownCopyFilesDestinations[PROMPTS_MARKDOWN_FILE_GLOB] = PROMPTS_SCREENSHOT_DESTINATION;
        hasChanges = true;
    }

    if (!hasChanges) {
        return 'unchanged';
    }

    const nextVscodeSettings: JsonObject = { ...vscodeSettings };
    nextVscodeSettings[MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY] = nextMarkdownCopyFilesDestinations;
    await writeFile(vscodeSettingsPath, serializeJsonObject(nextVscodeSettings, formatting), 'utf-8');
    return vscodeSettingsContent === undefined ? 'created' : 'updated';
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
    printInitializationStatusLine('prompts/', summary.promptsDirectoryStatus);
    printInitializationStatusLine('prompts/done/', summary.promptsDoneDirectoryStatus);
    printInitializationStatusLine('prompts/templates/', summary.promptsTemplatesDirectoryStatus);

    for (const templateFileStatus of summary.promptTemplateFileStatuses) {
        printInitializationStatusLine(formatDisplayPath(templateFileStatus.relativeFilePath), templateFileStatus.status);
    }

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

/**
 * Normalizes one project-relative path for human-readable CLI output.
 */
function formatDisplayPath(relativePath: string): string {
    return relativePath.replace(/\\/gu, '/');
}

/**
 * Detects whether `.gitignore` already covers the standalone coder temp directory.
 */
function hasTmpGitignoreRule(gitignoreContent: string): boolean {
    return /(^|[\r\n])\/?\.tmp(?:[\r\n]|$)/u.test(gitignoreContent);
}

/**
 * Reads one text file when it exists, otherwise returns `undefined`.
 */
async function readTextFileIfExists(path: string): Promise<string | undefined> {
    if (!(await isExistingFile(path))) {
        return undefined;
    }

    return readFile(path, 'utf-8');
}

/**
 * Parses one JSON object file while accepting VS Code style comments and trailing commas.
 */
async function parseJsonObjectFile(relativeFilePath: string, fileContent: string): Promise<JsonObject> {
    if (fileContent.trim() === '') {
        return {};
    }

    const typescript = await import('typescript');
    const parsedFile = typescript.parseConfigFileTextToJson(relativeFilePath, fileContent);
    if (parsedFile.error) {
        throw new ParseError(
            spaceTrim(`
                Cannot parse \`${relativeFilePath}\` as JSON.

                ${typescript.flattenDiagnosticMessageText(parsedFile.error.messageText, '\n')}
            `),
        );
    }

    if (!isPlainObject(parsedFile.config)) {
        throw new ParseError(
            spaceTrim(`
                File \`${relativeFilePath}\` must contain one top-level JSON object.
            `),
        );
    }

    return parsedFile.config;
}

/**
 * Reads one JSON object field as a string-to-string record.
 */
function getStringRecordOrDefault(value: unknown, relativeFilePath: string, fieldPath: string): Record<string, string> {
    if (value === undefined) {
        return {};
    }

    if (!isPlainObject(value)) {
        throw new ParseError(
            spaceTrim(`
                File \`${relativeFilePath}\` contains invalid \`${fieldPath}\`.

                Expected \`${fieldPath}\` to be an object with string values.
            `),
        );
    }

    const stringRecord: Record<string, string> = {};
    for (const [key, itemValue] of Object.entries(value)) {
        if (typeof itemValue !== 'string') {
            throw new ParseError(
                spaceTrim(`
                    File \`${relativeFilePath}\` contains invalid \`${fieldPath}.${key}\`.

                    Expected \`${fieldPath}\` to be an object with string values.
                `),
            );
        }

        stringRecord[key] = itemValue;
    }

    return stringRecord;
}

/**
 * Serializes one JSON object using detected or default formatting.
 */
function serializeJsonObject(value: JsonObject, formatting: JsonFileFormatting): string {
    return `${JSON.stringify(value, null, formatting.indentation)}${formatting.newline}`;
}

/**
 * Detects indentation and newline formatting from an existing JSON file.
 */
function detectJsonFileFormatting(fileContent: string | undefined): JsonFileFormatting {
    if (!fileContent) {
        return {
            indentation: DEFAULT_JSON_FILE_INDENTATION,
            newline: DEFAULT_JSON_FILE_NEWLINE,
        };
    }

    const indentationMatch = fileContent.match(/^[ \t]+(?=")/mu);
    return {
        indentation: indentationMatch?.[0] || DEFAULT_JSON_FILE_INDENTATION,
        newline: fileContent.includes('\r\n') ? '\r\n' : '\n',
    };
}

/**
 * Checks whether one parsed JSON value is a plain object.
 */
function isPlainObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
