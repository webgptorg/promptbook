import { readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { escapeRegExp } from '../../../utils/chat/escapeRegExp';

/**
 * File status returned by project configuration bootstrapping helpers.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export type ProjectInitializationStatus = 'created' | 'updated' | 'unchanged';

/**
 * Minimal environment variable descriptor used for additive `.env` initialization.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export type ProjectEnvVariableDefinition = {
    readonly name: string;
};

/**
 * Result of one additive `.env` initialization attempt.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export type EnsureProjectEnvFileResult = {
    readonly envFileStatus: ProjectInitializationStatus;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
};

/**
 * Options required to append missing variables into a project `.env`.
 */
type EnsureProjectEnvFileOptions<TEnvVariable extends ProjectEnvVariableDefinition> = {
    readonly projectPath: string;
    readonly emptyFileContent: string;
    readonly envVariables: ReadonlyArray<TEnvVariable>;
    readonly buildMissingEnvVariablesBlock: (envVariables: ReadonlyArray<TEnvVariable>) => string;
};

/**
 * Options required to append missing rules into a project `.gitignore`.
 */
type EnsureProjectGitignoreFileOptions = {
    readonly projectPath: string;
    readonly blockHeader: string;
    readonly rules: ReadonlyArray<string>;
};

/**
 * Relative path to a project `.env` file.
 */
const ENV_FILE_PATH = '.env';

/**
 * Relative path to a project `.gitignore` file.
 */
const GITIGNORE_FILE_PATH = '.gitignore';

/**
 * Ensures `.env` exists and appends only still-missing variable definitions.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export async function ensureProjectEnvFile<TEnvVariable extends ProjectEnvVariableDefinition>({
    projectPath,
    emptyFileContent,
    envVariables,
    buildMissingEnvVariablesBlock,
}: EnsureProjectEnvFileOptions<TEnvVariable>): Promise<EnsureProjectEnvFileResult> {
    const envFilePath = join(projectPath, ENV_FILE_PATH);
    const existingEnvContent = await readTextFileIfExists(envFilePath);
    const isEnvFileExisting = existingEnvContent !== undefined;
    const currentEnvContent = existingEnvContent || '';
    const existingEnvVariableNames = parseEnvVariableNames(currentEnvContent);
    const missingEnvVariables = envVariables.filter(({ name }) => !existingEnvVariableNames.has(name));

    if (missingEnvVariables.length === 0) {
        if (!isEnvFileExisting) {
            await writeFile(envFilePath, emptyFileContent, 'utf-8');
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
        envFileStatus: isEnvFileExisting ? 'updated' : 'created',
        initializedEnvVariableNames: missingEnvVariables.map(({ name }) => name),
    };
}

/**
 * Ensures `.gitignore` contains all required project initialization rules.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export async function ensureProjectGitignoreFile({
    projectPath,
    blockHeader,
    rules,
}: EnsureProjectGitignoreFileOptions): Promise<ProjectInitializationStatus> {
    const gitignorePath = join(projectPath, GITIGNORE_FILE_PATH);
    const currentGitignoreContent = await readTextFileIfExists(gitignorePath);
    const missingRules = rules.filter((rule) => !hasGitignoreRule(currentGitignoreContent || '', rule));

    if (currentGitignoreContent !== undefined && missingRules.length === 0) {
        return 'unchanged';
    }

    const nextGitignoreContent = appendBlock(currentGitignoreContent || '', [blockHeader, ...missingRules].join('\n'));
    await writeFile(gitignorePath, nextGitignoreContent, 'utf-8');
    return currentGitignoreContent === undefined ? 'created' : 'updated';
}

/**
 * Reads one text file when it exists, otherwise returns `undefined`.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export async function readTextFileIfExists(path: string): Promise<string | undefined> {
    try {
        const fileStats = await stat(path);
        if (!fileStats.isFile()) {
            return undefined;
        }
    } catch {
        return undefined;
    }

    return readFile(path, 'utf-8');
}

/**
 * Appends one text block to existing file content while preserving readable newlines.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export function appendBlock(currentContent: string, blockToAppend: string): string {
    if (currentContent.trim() === '') {
        return `${blockToAppend}\n`;
    }

    const normalizedCurrentContent = currentContent.endsWith('\n') ? currentContent : `${currentContent}\n`;
    return `${normalizedCurrentContent}\n${blockToAppend}\n`;
}

/**
 * Parses active or commented-out variable names currently defined in `.env` style content.
 */
function parseEnvVariableNames(envContent: string): Set<string> {
    const variableNames = new Set<string>();

    for (const line of envContent.split(/\r?\n/gu)) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
            continue;
        }

        const match = trimmedLine.match(/^(?:#\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u);
        if (!match || !match[1]) {
            continue;
        }

        variableNames.add(match[1]);
    }

    return variableNames;
}

/**
 * Detects whether `.gitignore` already covers one exact rule.
 */
function hasGitignoreRule(gitignoreContent: string, rule: string): boolean {
    const normalizedRulePattern = rule.startsWith('/') ? `/?${escapeRegExp(rule.slice(1))}` : escapeRegExp(rule);
    return new RegExp(`(^|[\\r\\n])${normalizedRulePattern}(?:[\\r\\n]|$)`, 'u').test(gitignoreContent);
}

// Note: [🟡] Code for CLI project initialization [projectInitialization](src/cli/cli-commands/common/projectInitialization.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
