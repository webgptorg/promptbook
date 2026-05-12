import type { ExternalChatRunnerGithubConfiguration } from './ExternalChatRunnerConfiguration';
import { EXTERNAL_CHAT_RUNNER_GITHUB_REQUEST_TIMEOUT_MS } from './externalChatRunnerConstants';

/**
 * GitHub REST API base URL.
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * GitHub API version used by the external chat runner integration.
 */
const GITHUB_API_VERSION = '2022-11-28';

/**
 * User agent sent to GitHub API from the Agents Server.
 */
const GITHUB_USER_AGENT = 'Promptbook-Agents-Server-External-Chat-Runner';

/**
 * Minimal repository metadata returned by GitHub.
 */
export type GithubRepositoryMetadata = {
    fullName: string;
    defaultBranch: string;
};

/**
 * Minimal content-file metadata returned by GitHub.
 */
export type GithubFileContent = {
    path: string;
    sha: string;
    content: string;
};

/**
 * Error thrown when a GitHub API request fails.
 */
export class GithubApiError extends Error {
    public readonly name = 'GithubApiError';

    public constructor(
        message: string,
        public readonly status: number,
        public readonly payload: unknown,
    ) {
        super(message);
        Object.setPrototypeOf(this, GithubApiError.prototype);
    }
}

/**
 * Loads one repository by full name.
 */
export async function getGithubRepository(
    configuration: ExternalChatRunnerGithubConfiguration,
    repositoryFullName: string,
): Promise<GithubRepositoryMetadata | null> {
    try {
        const payload = await requestGithubJson<GithubRepositoryApiPayload>({
            configuration,
            method: 'GET',
            path: `/repos/${encodeRepositoryFullName(repositoryFullName)}`,
        });

        return mapGithubRepositoryApiPayload(payload);
    } catch (error) {
        if (isGithubApiNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Creates one GitHub repository under the configured owner.
 */
export async function createGithubRepository(
    configuration: ExternalChatRunnerGithubConfiguration,
    repositoryName: string,
): Promise<GithubRepositoryMetadata> {
    const body = createGithubRepositoryRequestBody(configuration, repositoryName);

    try {
        const payload = await requestGithubJson<GithubRepositoryApiPayload>({
            configuration,
            method: 'POST',
            path: `/orgs/${encodeURIComponent(configuration.owner)}/repos`,
            body,
        });

        return mapGithubRepositoryApiPayload(payload);
    } catch (error) {
        if (!isGithubApiNotFoundError(error)) {
            throw error;
        }
    }

    const payload = await requestGithubJson<GithubRepositoryApiPayload>({
        configuration,
        method: 'POST',
        path: '/user/repos',
        body,
    });

    return mapGithubRepositoryApiPayload(payload);
}

/**
 * Reads a UTF-8 file from a GitHub repository.
 */
export async function readGithubFile(
    configuration: ExternalChatRunnerGithubConfiguration,
    repositoryFullName: string,
    path: string,
): Promise<GithubFileContent | null> {
    try {
        const payload = await requestGithubJson<GithubContentsApiPayload>({
            configuration,
            method: 'GET',
            path: `/repos/${encodeRepositoryFullName(repositoryFullName)}/contents/${encodeContentPath(path)}`,
        });

        if (Array.isArray(payload)) {
            throw new Error(`GitHub path "${path}" in "${repositoryFullName}" is not a file.`);
        }

        const filePayload = payload as GithubContentsFileApiPayload;

        if (filePayload.type !== 'file' || typeof filePayload.sha !== 'string') {
            throw new Error(`GitHub path "${path}" in "${repositoryFullName}" is not a file.`);
        }

        return {
            path: filePayload.path || path,
            sha: filePayload.sha,
            content: decodeGithubFileContent(filePayload),
        };
    } catch (error) {
        if (isGithubApiNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Creates or updates one UTF-8 file when the content differs.
 */
export async function upsertGithubFile(options: {
    configuration: ExternalChatRunnerGithubConfiguration;
    repositoryFullName: string;
    path: string;
    content: string;
    message: string;
}): Promise<boolean> {
    const currentFile = await readGithubFile(options.configuration, options.repositoryFullName, options.path);

    if (currentFile?.content === options.content) {
        return false;
    }

    await writeGithubFile({
        ...options,
        sha: currentFile?.sha,
    });

    return true;
}

/**
 * Creates one UTF-8 file and leaves an existing file untouched.
 */
export async function createGithubFileIfMissing(options: {
    configuration: ExternalChatRunnerGithubConfiguration;
    repositoryFullName: string;
    path: string;
    content: string;
    message: string;
}): Promise<boolean> {
    const currentFile = await readGithubFile(options.configuration, options.repositoryFullName, options.path);
    if (currentFile) {
        return false;
    }

    await writeGithubFile(options);
    return true;
}

/**
 * Returns true when a caught value is a GitHub 404 response.
 */
export function isGithubApiNotFoundError(error: unknown): boolean {
    return error instanceof GithubApiError && error.status === 404;
}

/**
 * Writes one UTF-8 file through the GitHub contents API.
 */
async function writeGithubFile(options: {
    configuration: ExternalChatRunnerGithubConfiguration;
    repositoryFullName: string;
    path: string;
    content: string;
    message: string;
    sha?: string;
}): Promise<void> {
    await requestGithubJson({
        configuration: options.configuration,
        method: 'PUT',
        path: `/repos/${encodeRepositoryFullName(options.repositoryFullName)}/contents/${encodeContentPath(options.path)}`,
        body: {
            message: options.message,
            content: Buffer.from(options.content, 'utf8').toString('base64'),
            ...(options.sha ? { sha: options.sha } : {}),
        },
    });
}

/**
 * Performs one authenticated JSON request against GitHub.
 */
async function requestGithubJson<TPayload>(options: {
    configuration: ExternalChatRunnerGithubConfiguration;
    method: 'GET' | 'POST' | 'PUT';
    path: string;
    body?: Record<string, unknown>;
}): Promise<TPayload> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), EXTERNAL_CHAT_RUNNER_GITHUB_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${GITHUB_API_BASE_URL}${options.path}`, {
            method: options.method,
            headers: {
                Authorization: `Bearer ${options.configuration.token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': GITHUB_API_VERSION,
                'User-Agent': GITHUB_USER_AGENT,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: abortController.signal,
        });
        const responseText = await response.text();
        const payload = parseGithubJsonPayload(responseText);

        if (!response.ok) {
            const message =
                payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
                    ? payload.message
                    : responseText || response.statusText;

            throw new GithubApiError(`GitHub API request failed (${response.status}): ${message}`, response.status, payload);
        }

        return payload as TPayload;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Builds a GitHub repository creation payload.
 */
function createGithubRepositoryRequestBody(
    configuration: ExternalChatRunnerGithubConfiguration,
    repositoryName: string,
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        name: repositoryName,
        auto_init: false,
        private: configuration.repositoryVisibility !== 'public',
    };

    if (configuration.repositoryVisibility === 'internal') {
        body.visibility = 'internal';
    }

    return body;
}

/**
 * Maps GitHub repository API payload to the local metadata shape.
 */
function mapGithubRepositoryApiPayload(payload: GithubRepositoryApiPayload): GithubRepositoryMetadata {
    if (typeof payload.full_name !== 'string' || payload.full_name.trim().length === 0) {
        throw new Error('GitHub repository response is missing full_name.');
    }

    return {
        fullName: payload.full_name,
        defaultBranch:
            typeof payload.default_branch === 'string' && payload.default_branch.trim().length > 0
                ? payload.default_branch
                : 'main',
    };
}

/**
 * Decodes a GitHub file-content API payload.
 */
function decodeGithubFileContent(payload: GithubContentsFileApiPayload): string {
    if (typeof payload.content !== 'string') {
        return '';
    }

    if (payload.encoding && payload.encoding !== 'base64') {
        throw new Error(`Unsupported GitHub file encoding "${payload.encoding}".`);
    }

    return Buffer.from(payload.content.replace(/\s/g, ''), 'base64').toString('utf8');
}

/**
 * Encodes an owner/repository pair for a GitHub REST path.
 */
function encodeRepositoryFullName(repositoryFullName: string): string {
    return repositoryFullName.split('/').map(encodeURIComponent).join('/');
}

/**
 * Encodes one repository content path for a GitHub REST path.
 */
function encodeContentPath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Parses one GitHub JSON response body.
 */
function parseGithubJsonPayload(responseText: string): unknown {
    if (!responseText.trim()) {
        return {};
    }

    return JSON.parse(responseText);
}

/**
 * Minimal GitHub repository API payload.
 */
type GithubRepositoryApiPayload = {
    full_name?: unknown;
    default_branch?: unknown;
};

/**
 * Minimal GitHub file content API payload.
 */
type GithubContentsFileApiPayload = {
    type?: unknown;
    path?: string;
    sha?: unknown;
    content?: unknown;
    encoding?: unknown;
};

/**
 * Minimal GitHub contents API response payload.
 */
type GithubContentsApiPayload = GithubContentsFileApiPayload | ReadonlyArray<GithubContentsFileApiPayload>;
