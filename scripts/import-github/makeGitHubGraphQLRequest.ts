import { TODO_any } from '../../src/utils/organization/TODO_any';

/**
 * Executes a GitHub GraphQL query using the service token, handling error reporting.
 * @param query GraphQL document to send to the GitHub API.
 * @param variables Optional variables to send alongside the query.
 * @private function of ImportGitHub
 */
export async function makeGitHubGraphQLRequest<T>(
    query: string,
    variables: Record<string, unknown> | null = null,
): Promise<T> {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        throw new Error(`GITHUB_TOKEN is not defined in the environment`);
    }

    const response: TODO_any = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
    });

    const data: TODO_any = await response.json();

    if (data.errors) {
        throw new Error(`GitHub API error: ${JSON.stringify(data.errors)}`);
    }

    return data.data as T;
}
