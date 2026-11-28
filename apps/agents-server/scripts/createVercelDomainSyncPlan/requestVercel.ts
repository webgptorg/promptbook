import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { VercelApiConfiguration } from './VercelDomainSyncPlan';

/**
 * Default Vercel API base URL.
 */
const VERCEL_API_BASE_URL = 'https://api.vercel.com';

/**
 * HTTP status returned by Vercel for successful delete responses without body.
 */
const HTTP_STATUS_NO_CONTENT = 204;

/**
 * Executes one Vercel API request and parses the JSON response.
 *
 * @param options - HTTP request options.
 * @returns Parsed JSON response body.
 *
 * @private function of `createVercelDomainSyncPlan`
 */
export async function requestVercel<TResponse = Record<string, unknown>>(options: {
    readonly configuration: VercelApiConfiguration;
    readonly method: 'GET' | 'POST' | 'DELETE';
    readonly pathname: string;
    readonly searchParams?: URLSearchParams;
    readonly body?: Record<string, unknown>;
}): Promise<TResponse> {
    const url = new URL(options.pathname, VERCEL_API_BASE_URL);
    const searchParams = new URLSearchParams(options.searchParams);
    if (options.configuration.teamId) {
        searchParams.set('teamId', options.configuration.teamId);
    }

    const serializedSearchParams = searchParams.toString();
    if (serializedSearchParams) {
        url.search = serializedSearchParams;
    }

    const response = await fetch(url, {
        method: options.method,
        headers: {
            Authorization: `Bearer ${options.configuration.token}`,
            'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new DatabaseError(
            spaceTrim(`
                Vercel API request failed.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Status: \`${response.status}\`
                Response: \`${responseText || '<empty>'}\`
            `),
        );
    }

    if (response.status === HTTP_STATUS_NO_CONTENT) {
        return {} as TResponse;
    }

    return (await response.json()) as TResponse;
}
