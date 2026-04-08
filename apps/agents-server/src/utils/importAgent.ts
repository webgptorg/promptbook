import {
    string_agent_name,
    string_agent_permanent_id,
    string_agent_url,
    string_book,
    TODO_any,
} from '../../../../src/_packages/types.index'; // <- [🚾]
import { assertsError } from '../../../../src/errors/assertsError';
import { NotYetImplementedError } from '../../../../src/errors/NotYetImplementedError';
import { deserializeError } from '../../../../src/errors/utils/deserializeError';
import { keepUnused } from '../../../../src/utils/organization/keepUnused';
import { isValidUrl } from '../../../../src/utils/validators/url/isValidUrl';

/**
 * @@@
 */
export type ImportAgentOptions = {
    /**
     * The current recursion level
     *
     * Used to prevent infinite loops when resolving inherited agent sources
     *
     * @default 0
     */
    recursionLevel?: number;
    /**
     * Already visited canonical agent URLs used for remote cycle detection.
     */
    readonly inheritancePath?: ReadonlyArray<string_agent_url>;
};

/**
 * Cached successful remote agent import payload.
 */
type ImportedAgentCacheRecord = {
    /**
     * Last successfully fetched agent source.
     */
    readonly source: string_book;

    /**
     * Last observed ETag returned by the remote `/api/book` endpoint.
     */
    readonly etag: string | null;

    /**
     * Last observed Last-Modified returned by the remote endpoint.
     */
    readonly lastModified: string | null;
};

/**
 * Successful remote imports cached by canonical agent identifier.
 */
const IMPORTED_AGENT_CACHE = new Map<string, ImportedAgentCacheRecord>();

/**
 * In-flight remote imports deduplicated by canonical agent identifier.
 */
const PENDING_IMPORTED_AGENT_REQUESTS = new Map<string, Promise<string_book>>();

/**
 * Builds the remote URL used to fetch a canonical agent book.
 *
 * @param agentIdentification - Agent page URL or direct book URL.
 * @param options - Import options controlling recursion metadata.
 * @returns Fetch URL with recursion/cycle-detection query parameters.
 */
function createAgentBookUrl(
    agentIdentification: string_agent_name | string_agent_permanent_id | string_agent_url,
    options: ImportAgentOptions,
): string {
    if (agentIdentification.endsWith('.book') || agentIdentification.endsWith('.md')) {
        return agentIdentification;
    }

    const recursionLevel = options.recursionLevel || 0;
    const baseUrl = agentIdentification.includes('/api/book')
        ? new URL(agentIdentification)
        : new URL(`${agentIdentification.replace(/\/$/, '')}/api/book`);

    baseUrl.searchParams.set('recursionLevel', String(recursionLevel + 1));

    for (const visitedAgentUrl of options.inheritancePath || []) {
        baseUrl.searchParams.append('resolutionPath', visitedAgentUrl);
    }

    return baseUrl.href;
}

/**
 * Returns a stable cache key for one imported agent.
 *
 * @param agentIdentification - Agent identifier provided to `importAgent`.
 * @returns Stable cache key reused across conditional fetches.
 */
function createImportCacheKey(
    agentIdentification: string_agent_name | string_agent_permanent_id | string_agent_url,
): string {
    return agentIdentification.replace(/\/+$/g, '');
}

/**
 * Extracts one text/book payload from a successful HTTP response.
 *
 * @param agentIdentification - Original agent identifier for diagnostics.
 * @param response - Successful HTTP response.
 * @returns Imported agent source text.
 */
async function readImportedAgentSource(
    agentIdentification: string_agent_name | string_agent_permanent_id | string_agent_url,
    response: Response,
): Promise<string_book> {
    const contentType: string | null = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const data: TODO_any = await response.json();
        if (typeof data === 'string') {
            return data as string_book;
        } else if (data.source) {
            return data.source as string_book;
        } else {
            console.warn(
                `Received JSON from ${agentIdentification} but couldn't determine source property. Using text.`,
            );
            throw new Error(`Received JSON from ${agentIdentification} but structure is unknown.`);
        }
    }

    return (await response.text()) as string_book;
}

/**
 * Imports an agent by its URL or name
 *
 * @param agentUrlOrName The identifier  of the agent to import
 * @returns The resolved agent source with inheritance applied
 */
export async function importAgent(
    agentIdentification: string_agent_name | string_agent_permanent_id | string_agent_url,
    options?: ImportAgentOptions,
): Promise<string_book> {
    console.log(`importAgent "${agentIdentification}"`);

    const { recursionLevel = 0 }: ImportAgentOptions = options || {};

    if (!isValidUrl(agentIdentification)) {
        throw new NotYetImplementedError(`[🏠] Importing local agents be name or permanent id is not implemented yet`);
    }

    const importOptions = {
        recursionLevel,
        inheritancePath: options?.inheritancePath,
    } satisfies ImportAgentOptions;
    const cacheKey = createImportCacheKey(agentIdentification);
    const cachedImport = IMPORTED_AGENT_CACHE.get(cacheKey);
    const existingRequest = PENDING_IMPORTED_AGENT_REQUESTS.get(cacheKey);
    if (existingRequest) {
        return existingRequest;
    }

    const pendingRequest = (async (): Promise<string_book> => {
        try {
            const agentBookUrl = createAgentBookUrl(agentIdentification, importOptions);
            const headers = new Headers();

            if (cachedImport?.etag) {
                headers.set('If-None-Match', cachedImport.etag);
            }

            if (!cachedImport?.etag && cachedImport?.lastModified) {
                headers.set('If-Modified-Since', cachedImport.lastModified);
            }

            const response: Response = await fetch(agentBookUrl, {
                cache: 'no-store',
                headers,
            });

            if (response.status === 304 && cachedImport) {
                return cachedImport.source;
            }

            if (!response.ok) {
                let error: Error | null = null;
                try {
                    const body: TODO_any = await response.json();
                    error = deserializeError(body, false);
                } catch (error: TODO_any) {
                    keepUnused(error);
                } finally {
                    if (error === null) {
                        error = new Error(
                            `Failed to fetch parent agent from ${agentBookUrl}: ${response.status} ${response.statusText}`,
                        );
                    }
                }

                throw error;
            }

            const source = await readImportedAgentSource(agentIdentification, response);
            IMPORTED_AGENT_CACHE.set(cacheKey, {
                source,
                etag: response.headers.get('etag'),
                lastModified: response.headers.get('last-modified'),
            });

            return source;
        } catch (error) {
            assertsError(error);

            error.message = `Failed to import agent from "${agentIdentification}"` + '\n\n' + error.message;
            throw error;
        } finally {
            PENDING_IMPORTED_AGENT_REQUESTS.delete(cacheKey);
        }
    })();

    PENDING_IMPORTED_AGENT_REQUESTS.set(cacheKey, pendingRequest);

    try {
        return await pendingRequest;
    } catch (error) {
        assertsError(error);

        throw error;

        /*

        throw new NotFoundError(
            spaceTrim(
                (block) => `
                    Failed to import agent from "${agentIdentification}"
                    
                    Raw error message:
                    ${block((error as Error).message)}
                `,
            ),
        );
        */
    }
}

// TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
// TODO: [🐱‍🚀][🏠] Implement local requesting agents by name and permanent ID
