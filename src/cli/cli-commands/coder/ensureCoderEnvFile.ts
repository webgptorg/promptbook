import { writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { appendBlock } from './appendBlock';
import type { InitializationStatus } from './boilerplateTemplates';
import { readTextFileIfExists } from './readTextFileIfExists';

/**
 * Shape of one required coder environment variable with its default value.
 */
type RequiredCoderEnvVariable = {
    readonly name: string;
    readonly value: string;
};

/**
 * Result of ensuring coder environment variables inside `.env`.
 */
type EnsureCoderEnvFileResult = {
    readonly envFileStatus: InitializationStatus;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
};

/**
 * Relative path to `.env` in the initialized project.
 */
const ENV_FILE_PATH = '.env';

/**
 * Fallback `.env` content used when no required variables need to be appended.
 */
const EMPTY_CODER_ENV_FILE_CONTENT = '# Environment variables for Promptbook coder\n';

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
 * Ensures `.env` exists and contains all required coder environment variables.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderEnvFile(projectPath: string): Promise<EnsureCoderEnvFileResult> {
    const envFilePath = join(projectPath, ENV_FILE_PATH);
    const existingEnvContent = await readTextFileIfExists(envFilePath);
    const isEnvFileExisting = existingEnvContent !== undefined;
    const currentEnvContent = existingEnvContent || '';
    const existingEnvVariableNames = parseEnvVariableNames(currentEnvContent);
    const missingEnvVariables = REQUIRED_CODER_ENV_VARIABLES.filter(({ name }) => !existingEnvVariableNames.has(name));

    if (missingEnvVariables.length === 0) {
        if (!isEnvFileExisting) {
            await writeFile(envFilePath, EMPTY_CODER_ENV_FILE_CONTENT, 'utf-8');
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
    return spaceTrim(
        (block) => `
            # Promptbook coder identity (initialized by \`ptbk coder init\`; add your values and uncomment to use)
            ${block(variables.map(({ name, value }) => `# ${name}=${JSON.stringify(value)}`).join('\n'))}
        `,
    );
}

// Note: [🟡] Code for coder init environment bootstrapping [ensureCoderEnvFile](src/cli/cli-commands/coder/ensureCoderEnvFile.ts) should never be published outside of `@promptbook/cli`
