import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';

/**
 * GitHub repository visibility values accepted by the external runner sync.
 */
export type ExternalChatRunnerGithubRepositoryVisibility = 'private' | 'public' | 'internal';

/**
 * Environment-backed GitHub configuration for external agent execution.
 */
export type ExternalChatRunnerGithubConfiguration = {
    token: string;
    owner: string;
    repositoryPrefix: string;
    repositoryVisibility: ExternalChatRunnerGithubRepositoryVisibility;
};

/**
 * Environment variable carrying the GitHub token used by Agents Server.
 */
export const PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV = 'PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN';

/**
 * Environment variable carrying the GitHub owner for created runner repositories.
 */
export const PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV = 'PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER';

/**
 * Environment variable carrying the optional runner repository name prefix.
 */
export const PROMPTBOOK_AGENT_RUNNER_GITHUB_REPOSITORY_PREFIX_ENV =
    'PROMPTBOOK_AGENT_RUNNER_GITHUB_REPOSITORY_PREFIX';

/**
 * Environment variable carrying the optional runner repository visibility.
 */
export const PROMPTBOOK_AGENT_RUNNER_GITHUB_VISIBILITY_ENV = 'PROMPTBOOK_AGENT_RUNNER_GITHUB_VISIBILITY';

/**
 * Default repository prefix used when no custom prefix is configured.
 */
const DEFAULT_EXTERNAL_CHAT_RUNNER_REPOSITORY_PREFIX = 'promptbook-agent-';

/**
 * Default repository visibility used when no custom visibility is configured.
 */
const DEFAULT_EXTERNAL_CHAT_RUNNER_REPOSITORY_VISIBILITY: ExternalChatRunnerGithubRepositoryVisibility = 'private';

/**
 * Loads GitHub configuration for the external chat runner from server environment variables.
 */
export function loadExternalChatRunnerGithubConfiguration(): ExternalChatRunnerGithubConfiguration | null {
    const token = process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV]?.trim() || '';
    const owner = process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV]?.trim() || '';

    if (!token || !owner) {
        return null;
    }

    return {
        token,
        owner,
        repositoryPrefix:
            process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_REPOSITORY_PREFIX_ENV]?.trim() ||
            DEFAULT_EXTERNAL_CHAT_RUNNER_REPOSITORY_PREFIX,
        repositoryVisibility: normalizeExternalChatRunnerGithubRepositoryVisibility(
            process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_VISIBILITY_ENV],
        ),
    };
}

/**
 * Ensures GitHub configuration exists for external chat execution.
 */
export function ensureExternalChatRunnerGithubConfiguration(): ExternalChatRunnerGithubConfiguration {
    const configuration = loadExternalChatRunnerGithubConfiguration();
    if (configuration) {
        return configuration;
    }

    throw new NotAllowed(
        spaceTrim(`
            External agent execution is not configured.

            Configure GitHub access in server environment variables:

            - \`${PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV}\`
            - \`${PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV}\`
        `),
    );
}

/**
 * Normalizes the optional GitHub repository visibility environment value.
 */
function normalizeExternalChatRunnerGithubRepositoryVisibility(
    value: string | undefined,
): ExternalChatRunnerGithubRepositoryVisibility {
    const normalized = value?.trim().toLowerCase();

    if (normalized === 'public' || normalized === 'internal' || normalized === 'private') {
        return normalized;
    }

    return DEFAULT_EXTERNAL_CHAT_RUNNER_REPOSITORY_VISIBILITY;
}
