/**
 * Runtime paths copied into the CLI package and used by the Agents Server production build.
 */
const AGENTS_SERVER_BUILD_INPUT_RELATIVE_PATHS = [
    'apps/agents-server',
    'apps/_common',
    'src',
    'books',
    'scripts/run-codex-prompts',
    'scripts/run-agent-chat',
    'scripts/run-agent-messages',
    'scripts/utils/prompts/isPromptDocumentationFile.ts',
    'scripts/utils/autocommit/isWorkingTreeClean.ts',
    'book/scripts/import-markdown/increaseHeadings.ts',
    'package.json',
    'package-lock.json',
    'security.config.ts',
    'servers.ts',
    'tsconfig.json',
] as const;

/**
 * Returns runtime input paths that can affect the materialized runtime and build fingerprint.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function getAgentsServerBuildInputRelativePaths(): typeof AGENTS_SERVER_BUILD_INPUT_RELATIVE_PATHS {
    return AGENTS_SERVER_BUILD_INPUT_RELATIVE_PATHS;
}
