import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { resolvePromptbookTemporaryPath } from '../../../../../src/utils/filesystem/promptbookTemporaryPath';

/**
 * Runtime environment variable that overrides the root directory for per-agent browser profiles.
 */
const AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY_ENV = 'AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY';

/**
 * Pattern of characters kept as-is inside one browser-profile directory name.
 */
const AGENT_BROWSER_PROFILE_DIRECTORY_NAME_UNSAFE_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Resolves the root filesystem directory holding all per-agent browser profiles.
 *
 * The profiles are persistent for the whole agent life (they survive browser and server restarts),
 * they are only co-located with other Promptbook working files by default.
 */
export function resolveAgentBrowserProfileStorageDirectory(): string {
    const configuredStorageDirectory = process.env[AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY_ENV];
    if (configuredStorageDirectory && configuredStorageDirectory.trim()) {
        return configuredStorageDirectory.trim();
    }

    return resolvePromptbookTemporaryPath(process.cwd(), 'agents-server', 'browser', 'profiles');
}

/**
 * Resolves the default persistent browser-profile directory of one agent.
 *
 * The result is deterministic for one agent so the same profile is reused by every browser session
 * of that agent, even before any wallet record exists.
 *
 * @param agentPermanentId - Canonical `Agent.permanentId`.
 * @returns Absolute or project-relative directory path of the agent browser profile.
 */
export function resolveDefaultAgentBrowserProfileDirectory(agentPermanentId: string): string {
    const normalizedAgentPermanentId = agentPermanentId.trim();
    if (!normalizedAgentPermanentId) {
        throw new UnexpectedError(
            spaceTrim(`
                Cannot resolve browser profile directory.

                The \`agentPermanentId\` is required but an empty value was provided.
            `),
        );
    }

    const directoryName = sanitizeAgentBrowserProfileDirectoryName(normalizedAgentPermanentId);
    return `${resolveAgentBrowserProfileStorageDirectory()}/agent-${directoryName}`;
}

/**
 * Converts one agent permanent id into a filesystem-safe directory name.
 *
 * @private function of `resolveDefaultAgentBrowserProfileDirectory`
 */
function sanitizeAgentBrowserProfileDirectoryName(agentPermanentId: string): string {
    return agentPermanentId.replace(AGENT_BROWSER_PROFILE_DIRECTORY_NAME_UNSAFE_CHARACTER_PATTERN, '-');
}
