import { readdir } from 'fs/promises';
import { join } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Environment variable carrying the GitHub token used to discover and clone agent repositories.
 */
export const PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV = 'PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN';

/**
 * Environment variable carrying the GitHub owner whose `agent-*` repositories should be mirrored locally.
 */
export const PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV = 'PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER';

/**
 * Prefix required for repositories managed by `ptbk agent run-multiple`.
 */
const AGENT_RUNNER_REPOSITORY_PREFIX = 'agent-';

/**
 * GitHub repository metadata consumed by the local multi-runner sync.
 */
type GithubAgentRepository = {
    readonly name: string;
    readonly fullName: string;
    readonly cloneUrl: string;
};

/**
 * Result of one GitHub synchronization round.
 */
export type GithubAgentRunnerRepositoriesSynchronizationResult = {
    readonly clonedRepositoryNames: ReadonlyArray<string>;
    readonly owner?: string;
    readonly synchronizedAt?: number;
};

/**
 * Loads the optional GitHub repository-mirroring configuration for multi-agent runs.
 */
export function loadAgentRunnerGithubConfiguration(): {
    readonly token: string;
    readonly owner: string;
} | null {
    const token = process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN_ENV]?.trim() || '';
    const owner = process.env[PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER_ENV]?.trim() || '';

    if (!token || !owner) {
        return null;
    }

    return { token, owner };
}

/**
 * Clones missing `agent-*` repositories from the configured GitHub owner into the direct child directories of `rootPath`.
 */
export async function synchronizeGithubAgentRunnerRepositories(
    rootPath: string,
): Promise<GithubAgentRunnerRepositoriesSynchronizationResult> {
    const configuration = loadAgentRunnerGithubConfiguration();
    if (!configuration) {
        return { clonedRepositoryNames: [] };
    }

    const [remoteRepositories, localDirectoryNames] = await Promise.all([
        listGithubAgentRepositories(configuration),
        listDirectChildDirectoryNames(rootPath),
    ]);
    const missingRepositories = remoteRepositories.filter((repository) => !localDirectoryNames.has(repository.name));

    for (const repository of missingRepositories) {
        await cloneGithubAgentRepository(rootPath, configuration.token, repository);
    }

    return {
        owner: configuration.owner,
        clonedRepositoryNames: missingRepositories.map((repository) => repository.name),
        synchronizedAt: Date.now(),
    };
}

/**
 * Lists direct child directory names below the local multi-run root.
 */
async function listDirectChildDirectoryNames(rootPath: string): Promise<Set<string>> {
    const directoryEntries = await readdir(rootPath, { withFileTypes: true });

    return new Set(
        directoryEntries
            .filter((directoryEntry) => directoryEntry.isDirectory())
            .map((directoryEntry) => directoryEntry.name),
    );
}

/**
 * Lists all remote `agent-*` repositories for the configured owner.
 */
async function listGithubAgentRepositories(configuration: {
    readonly token: string;
    readonly owner: string;
}): Promise<ReadonlyArray<GithubAgentRepository>> {
    const userRepositories = await fetchGithubRepositoriesForOwnerEndpoint(configuration, 'users');
    if (userRepositories !== null) {
        return userRepositories;
    }

    const organizationRepositories = await fetchGithubRepositoriesForOwnerEndpoint(configuration, 'orgs');
    if (organizationRepositories !== null) {
        return organizationRepositories;
    }

    throw new Error(`Failed to list GitHub repositories for "${configuration.owner}".`);
}

/**
 * Fetches repositories from one GitHub owner endpoint family and returns `null` when that owner type does not exist there.
 */
async function fetchGithubRepositoriesForOwnerEndpoint(
    configuration: {
        readonly token: string;
        readonly owner: string;
    },
    ownerType: 'users' | 'orgs',
): Promise<ReadonlyArray<GithubAgentRepository> | null> {
    const repositories: GithubAgentRepository[] = [];

    for (let page = 1; ; page++) {
        const response = await fetch(
            `https://api.github.com/${ownerType}/${encodeURIComponent(
                configuration.owner,
            )}/repos?per_page=100&page=${page}&sort=full_name`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${configuration.token}`,
                    'User-Agent': 'promptbook-agent-runner',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            },
        );

        if (response.status === 404 && page === 1) {
            return null;
        }

        if (!response.ok) {
            throw new Error(
                `GitHub repository listing failed for "${configuration.owner}" (${ownerType}) with ${response.status} ${response.statusText}.`,
            );
        }

        const pageRepositories = (await response.json()) as ReadonlyArray<{
            readonly name?: string;
            readonly full_name?: string;
            readonly clone_url?: string;
            readonly archived?: boolean;
            readonly disabled?: boolean;
        }>;
        const normalizedPageRepositories = pageRepositories
            .filter(
                (repository) =>
                    !repository.archived &&
                    !repository.disabled &&
                    typeof repository.name === 'string' &&
                    repository.name.startsWith(AGENT_RUNNER_REPOSITORY_PREFIX) &&
                    typeof repository.full_name === 'string' &&
                    typeof repository.clone_url === 'string',
            )
            .map(
                (repository) =>
                    ({
                        name: repository.name!,
                        fullName: repository.full_name!,
                        cloneUrl: repository.clone_url!,
                    } satisfies GithubAgentRepository),
            );

        repositories.push(...normalizedPageRepositories);

        if (pageRepositories.length < 100) {
            break;
        }
    }

    return repositories.sort((firstRepository, secondRepository) =>
        firstRepository.name.localeCompare(secondRepository.name),
    );
}

/**
 * Clones one remote runner repository into the multi-agent root.
 */
async function cloneGithubAgentRepository(
    rootPath: string,
    token: string,
    repository: GithubAgentRepository,
): Promise<void> {
    const encodedToken = encodeURIComponent(token);
    const authenticatedCloneUrl = repository.cloneUrl.replace(
        /^https:\/\//iu,
        `https://x-access-token:${encodedToken}@`,
    );

    try {
        await $execCommand({
            command: `git clone --quiet "${authenticatedCloneUrl}" "${join(rootPath, repository.name)}"`,
            cwd: rootPath,
            isVerbose: false,
        });
    } catch (error) {
        throw sanitizeGithubTokenInError(token, error);
    }
}

/**
 * Removes GitHub token values from thrown clone errors.
 */
function sanitizeGithubTokenInError(token: string, error: unknown): Error {
    const rawMessage = error instanceof Error ? error.stack || error.message : String(error);
    const encodedToken = encodeURIComponent(token);
    return new Error(rawMessage.split(token).join('***').split(encodedToken).join('***'));
}
