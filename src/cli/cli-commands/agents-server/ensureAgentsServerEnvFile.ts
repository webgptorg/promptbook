import { ensureProjectEnvFile, type EnsureProjectEnvFileResult } from '../common/projectInitialization';

/**
 * Agents Server environment variable initialized for local startup.
 */
type RequiredAgentsServerEnvVariable = {
    readonly name: string;
    readonly value: string;
    readonly documentationUrl: string;
};

/**
 * Fallback `.env` content used when no Agents Server variables need to be appended.
 */
const EMPTY_AGENTS_SERVER_ENV_FILE_CONTENT = '# Environment variables for Promptbook Agents Server\n';

/**
 * Documentation base for variables initialized by `ptbk agents-server init`.
 */
const AGENTS_SERVER_ENV_DOCUMENTATION_BASE_URL =
    'https://github.com/webgptorg/promptbook/blob/main/apps/agents-server/README.md#agents-server-env-';

/**
 * Header explaining the source of each generated Agents Server variable.
 */
const AGENTS_SERVER_ENV_CREATED_COMMENT = '# Created by `ptbk agents-server init` command';

/**
 * Variables required for a local Agents Server backed by Supabase or standalone SQLite.
 */
const REQUIRED_AGENTS_SERVER_ENV_VARIABLES: ReadonlyArray<RequiredAgentsServerEnvVariable> = [
    createAgentsServerEnvVariable('PTBK_AGENTS_SERVER_DATABASE', 'supabase'),
    createAgentsServerEnvVariable('PTBK_AGENTS_SERVER_SQLITE_PATH', '.promptbook/agents-server.sqlite'),
    createAgentsServerEnvVariable('OPENAI_API_KEY', ''),
    createAgentsServerEnvVariable('POSTGRES_URL', ''),
    createAgentsServerEnvVariable('NEXT_PUBLIC_SUPABASE_URL', ''),
    createAgentsServerEnvVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
    createAgentsServerEnvVariable('SUPABASE_SERVICE_ROLE_KEY', ''),
    createAgentsServerEnvVariable('SUPABASE_AUTO_MIGRATE', 'true'),
    createAgentsServerEnvVariable('ADMIN_PASSWORD', ''),
];

/**
 * Ensures `.env` contains all required Agents Server configuration entries.
 *
 * @private internal utility of `ptbk agents-server init`
 */
export async function ensureAgentsServerEnvFile(projectPath: string): Promise<EnsureProjectEnvFileResult> {
    return ensureProjectEnvFile({
        projectPath,
        emptyFileContent: EMPTY_AGENTS_SERVER_ENV_FILE_CONTENT,
        envVariables: REQUIRED_AGENTS_SERVER_ENV_VARIABLES,
        buildMissingEnvVariablesBlock,
    });
}

/**
 * Builds one initialized Agents Server environment variable definition.
 */
function createAgentsServerEnvVariable(name: string, value: string): RequiredAgentsServerEnvVariable {
    return {
        name,
        value,
        documentationUrl: `${AGENTS_SERVER_ENV_DOCUMENTATION_BASE_URL}${name.toLowerCase().replace(/_/gu, '-')}`,
    };
}

/**
 * Builds a `.env` block containing missing Agents Server variables and documentation links.
 */
function buildMissingEnvVariablesBlock(variables: ReadonlyArray<RequiredAgentsServerEnvVariable>): string {
    const variableBlocks = variables.map(({ documentationUrl, name, value }) =>
        [AGENTS_SERVER_ENV_CREATED_COMMENT, `# Documentation: ${documentationUrl}`, `${name}=${value}`].join('\n'),
    );

    return ['# Promptbook Agents Server', ...variableBlocks].join('\n\n');
}

// Note: [🟡] Code for Agents Server environment bootstrapping [ensureAgentsServerEnvFile](src/cli/cli-commands/agents-server/ensureAgentsServerEnvFile.ts) should never be published outside of `@promptbook/cli`
