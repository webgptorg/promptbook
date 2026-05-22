import { spaceTrim } from 'spacetrim';
import type { InitializationStatus } from './boilerplateTemplates';
import { ensureProjectEnvFile } from '../common/projectInitialization';

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
    return ensureProjectEnvFile({
        projectPath,
        emptyFileContent: EMPTY_CODER_ENV_FILE_CONTENT,
        envVariables: REQUIRED_CODER_ENV_VARIABLES,
        buildMissingEnvVariablesBlock,
    });
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
