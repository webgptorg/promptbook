import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { CloudflareApiConfiguration } from './CloudflareDnsRecordSyncPlan';

/**
 * Default Cloudflare API base URL.
 */
const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

/**
 * Generic paginated Cloudflare API envelope.
 */
type CloudflareApiEnvelope<TResult> = {
    /**
     * Whether the API call succeeded.
     */
    readonly success: boolean;
    /**
     * Response payload.
     */
    readonly result: TResult;
    /**
     * Pagination metadata.
     */
    readonly result_info?: {
        /**
         * Current page number.
         */
        readonly page?: number;
        /**
         * Total number of pages.
         */
        readonly total_pages?: number;
    };
    /**
     * API error payloads.
     */
    readonly errors?: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Executes one Cloudflare API request and parses the JSON response envelope.
 *
 * @param options - HTTP request options.
 * @returns Parsed Cloudflare response envelope.
 *
 * @private function of `syncCloudflareDnsRecords`
 */
export async function requestCloudflare<TResult = Record<string, unknown>>(options: {
    readonly configuration: CloudflareApiConfiguration;
    readonly method: 'GET' | 'POST' | 'PATCH';
    readonly pathname: string;
    readonly searchParams?: URLSearchParams;
    readonly body?: Record<string, unknown>;
}): Promise<CloudflareApiEnvelope<TResult>> {
    const normalizedPathname = options.pathname.startsWith('/') ? options.pathname.slice(1) : options.pathname;
    const url = new URL(normalizedPathname, `${CLOUDFLARE_API_BASE_URL}/`);
    const serializedSearchParams = options.searchParams?.toString() || '';
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
    const responseText = await response.text();

    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Cloudflare API request failed.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Status: \`${response.status}\`
                Response: \`${responseText || '<empty>'}\`
            `),
        );
    }

    const parsedResponse = (
        responseText ? JSON.parse(responseText) : { success: true, result: {} }
    ) as CloudflareApiEnvelope<TResult>;
    if (!parsedResponse.success) {
        throw new DatabaseError(
            spaceTrim(`
                Cloudflare API request returned an unsuccessful envelope.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Errors: \`${JSON.stringify(parsedResponse.errors || [])}\`
            `),
        );
    }

    return parsedResponse;
}
