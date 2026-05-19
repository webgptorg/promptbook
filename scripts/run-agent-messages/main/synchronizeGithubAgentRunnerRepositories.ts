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
 * GitHub REST API base URL.
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * GitHub REST API version used by the local agent runner synchronizer.
 */
const GITHUB_API_VERSION = '2022-11-28';

/**
 * Maximum number of repositories requested from GitHub in one page.
 */
const GITHUB_REPOSITORIES_PAGE_SIZE = 100;

/**
 * GitHub owner endpoints that can expose public owner repositories.
 */
const GITHUB_OWNER_ENDPOINT_TYPES = ['users', 'orgs'] as const;

/**
 * GitHub repository metadata consumed by the local multi-runner sync.
 */
type GithubAgentRepository = {
    readonly name: string;
    readonly fullName: string;
    readonly cloneUrl: string;
};

/**
 * GitHub repository shape read from REST listing endpoints.
 */
type GithubRepositoryApiPayload = {
    readonly name?: string;
    readonly full_name?: string;
    readonly clone_url?: string;
    readonly archived?: boolean;
    readonly disabled?: boolean;
    readonly owner?: {
        readonly login?: string;
    };
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
    const repositoriesByName = new Map<string, GithubAgentRepository>();
    const authenticatedRepositories = await fetchGithubRepositoriesForAuthenticatedUser(configuration);
    const ownerEndpointRepositories = await fetchGithubRepositoriesForConfiguredOwner(configuration);

    for (const repository of [...authenticatedRepositories, ...(ownerEndpointRepositories || [])]) {
        repositoriesByName.set(repository.name.toLowerCase(), repository);
    }

    if (repositoriesByName.size === 0 && ownerEndpointRepositories === null) {
        throw new Error(`Failed to list GitHub repositories for "${configuration.owner}".`);
    }

    return [...repositoriesByName.values()].sort((firstRepository, secondRepository) =>
        firstRepository.name.localeCompare(secondRepository.name),
    );
}

/**
 * Lists accessible repositories from the authenticated-user endpoint, including private repositories visible to the token.
 */
async function fetchGithubRepositoriesForAuthenticatedUser(configuration: {
    readonly token: string;
    readonly owner: string;
}): Promise<ReadonlyArray<GithubAgentRepository>> {
    const repositories = await fetchGithubRepositoryPages({
        configuration,
        path: '/user/repos',
        queryParameters: {
            affiliation: 'owner,collaborator,organization_member',
            direction: 'asc',
            sort: 'full_name',
            visibility: 'all',
        },
        firstPageStatusesReturningNull: [401, 403, 404],
        shouldIncludeRepository: (repository) => isRepositoryOwnedByConfiguredOwner(repository, configuration.owner),
    });

    return repositories || [];
}

/**
 * Lists repositories from the configured owner endpoint for backwards-compatible public repository discovery.
 */
async function fetchGithubRepositoriesForConfiguredOwner(configuration: {
    readonly token: string;
    readonly owner: string;
}): Promise<ReadonlyArray<GithubAgentRepository> | null> {
    const repositoriesByName = new Map<string, GithubAgentRepository>();
    let isOwnerEndpointFound = false;

    for (const ownerType of GITHUB_OWNER_ENDPOINT_TYPES) {
        const repositories = await fetchGithubRepositoriesForOwnerEndpoint(configuration, ownerType);

        if (repositories === null) {
            continue;
        }

        isOwnerEndpointFound = true;

        for (const repository of repositories) {
            repositoriesByName.set(repository.name.toLowerCase(), repository);
        }
    }

    if (!isOwnerEndpointFound) {
        return null;
    }

    return [...repositoriesByName.values()].sort((firstRepository, secondRepository) =>
        firstRepository.name.localeCompare(secondRepository.name),
    );
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
    return await fetchGithubRepositoryPages({
        configuration,
        path: `/${ownerType}/${encodeURIComponent(configuration.owner)}/repos`,
        queryParameters: {
            sort: 'full_name',
        },
        firstPageStatusesReturningNull: [404],
    });
}

/**
 * Fetches and maps paginated GitHub repository listings.
 */
async function fetchGithubRepositoryPages(options: {
    readonly configuration: {
        readonly token: string;
        readonly owner: string;
    };
    readonly path: string;
    readonly queryParameters?: Record<string, string>;
    readonly firstPageStatusesReturningNull?: ReadonlyArray<number>;
    readonly shouldIncludeRepository?: (repository: GithubRepositoryApiPayload) => boolean;
}): Promise<ReadonlyArray<GithubAgentRepository> | null> {
    const {
        configuration,
        path,
        queryParameters = {},
        firstPageStatusesReturningNull = [],
        shouldIncludeRepository = () => true,
    } = options;
    const repositories: GithubAgentRepository[] = [];

    for (let page = 1; ; page++) {
        const response = await fetch(buildGithubRepositoryPageUrl(path, page, queryParameters), {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${configuration.token}`,
                'User-Agent': 'promptbook-agent-runner',
                'X-GitHub-Api-Version': GITHUB_API_VERSION,
            },
        });

        if (page === 1 && firstPageStatusesReturningNull.includes(response.status)) {
            return null;
        }

        if (!response.ok) {
            throw new Error(
                `GitHub repository listing failed for "${configuration.owner}" (${path}) with ${response.status} ${response.statusText}.`,
            );
        }

        const pageRepositories = (await response.json()) as ReadonlyArray<GithubRepositoryApiPayload>;
        const normalizedPageRepositories = pageRepositories
            .filter(
                (repository) =>
                    shouldIncludeRepository(repository) &&
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

        if (pageRepositories.length < GITHUB_REPOSITORIES_PAGE_SIZE) {
            break;
        }
    }

    return repositories.sort((firstRepository, secondRepository) =>
        firstRepository.name.localeCompare(secondRepository.name),
    );
}

/**
 * Builds one GitHub repository listing URL with shared pagination parameters.
 */
function buildGithubRepositoryPageUrl(path: string, page: number, queryParameters: Record<string, string>): string {
    const url = new URL(`${GITHUB_API_BASE_URL}${path}`);

    url.searchParams.set('per_page', String(GITHUB_REPOSITORIES_PAGE_SIZE));
    url.searchParams.set('page', String(page));

    for (const [name, value] of Object.entries(queryParameters)) {
        url.searchParams.set(name, value);
    }

    return url.toString();
}

/**
 * Returns true when a repository belongs to the configured owner.
 */
function isRepositoryOwnedByConfiguredOwner(repository: GithubRepositoryApiPayload, configuredOwner: string): boolean {
    const normalizedConfiguredOwner = configuredOwner.toLowerCase();
    const repositoryOwner =
        typeof repository.owner?.login === 'string' && repository.owner.login.trim().length > 0
            ? repository.owner.login
            : typeof repository.full_name === 'string'
            ? repository.full_name.split('/')[0] || ''
            : '';

    return repositoryOwner.toLowerCase() === normalizedConfiguredOwner;
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
