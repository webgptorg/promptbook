import { spaceTrim } from 'spacetrim';

/**
 * Base GitHub API URL.
 *
 * @private constant of callGitHubApi
 */
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * Minimal shape returned by GitHub content APIs.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectGitHubContentsItem = {
    type: string;
    name: string;
    path: string;
    sha?: string;
    size?: number;
    content?: string;
    html_url?: string;
    download_url?: string;
};

/**
 * Minimal shape of GitHub branch reference API response.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectGitHubGitRefResponse = {
    object?: {
        sha?: string;
    };
};

/**
 * Minimal shape of GitHub repository API response.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectGitHubRepositoryResponse = {
    default_branch?: string;
};

/**
 * Minimal shape of GitHub pull request response.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectGitHubPullRequestResponse = {
    number?: number;
    html_url?: string;
    title?: string;
    state?: string;
    head?: {
        ref?: string;
    };
    base?: {
        ref?: string;
    };
};

/**
 * Options for one GitHub API call.
 *
 * @private type of callGitHubApi
 */
type CallGitHubApiOptions = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    allowNotFound?: boolean;
};

/**
 * Runs one GitHub API request and parses JSON response payload.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export async function callGitHubApi<TResponse = unknown>(
    token: string,
    options: CallGitHubApiOptions,
): Promise<TResponse | null> {
    const url = new URL(options.path, GITHUB_API_BASE_URL);
    if (options.query) {
        for (const [key, value] of Object.entries(options.query)) {
            if (value && value.trim()) {
                url.searchParams.set(key, value);
            }
        }
    }

    const response = await fetch(url.toString(), {
        method: options.method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Promptbook-UseProject-Tool',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const textPayload = await response.text();
    const parsedPayload = tryParseJson(textPayload);

    if (options.allowNotFound && response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(
            spaceTrim(`
                GitHub API request failed (${response.status} ${response.statusText}):
                ${extractGitHubApiErrorMessage(parsedPayload, textPayload)}
            `),
        );
    }

    return parsedPayload as TResponse;
}

/**
 * Parses raw text into JSON when possible.
 *
 * @private function of callGitHubApi
 */
function tryParseJson(rawText: string): unknown {
    if (!rawText.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

/**
 * Extracts a user-friendly GitHub API error message.
 *
 * @private function of callGitHubApi
 */
function extractGitHubApiErrorMessage(parsedPayload: unknown, fallbackText: string): string {
    if (parsedPayload && typeof parsedPayload === 'object') {
        const payload = parsedPayload as { message?: unknown; errors?: unknown };
        const message = typeof payload.message === 'string' ? payload.message : '';
        const errors = Array.isArray(payload.errors) ? payload.errors : [];
        const flattenedErrors = errors
            .map((errorEntry) => {
                if (typeof errorEntry === 'string') {
                    return errorEntry;
                }

                if (errorEntry && typeof errorEntry === 'object' && 'message' in errorEntry) {
                    const errorMessage = (errorEntry as { message?: unknown }).message;
                    return typeof errorMessage === 'string' ? errorMessage : '';
                }

                return '';
            })
            .filter(Boolean);

        if (message || flattenedErrors.length > 0) {
            return [message, ...flattenedErrors].filter(Boolean).join(' | ');
        }
    }

    return fallbackText || 'Unknown GitHub API error';
}
