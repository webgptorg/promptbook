import { NotYetImplementedError } from '../../../../src/_packages/core.index'; // <- [🚾]
import {
    string_agent_name,
    string_agent_permanent_id,
    string_agent_url,
    string_book,
    TODO_any,
} from '../../../../src/_packages/types.index'; // <- [🚾]
import { deserializeError, isValidUrl } from '../../../../src/_packages/utils.index'; // <- [🚾]
import { assertsError } from '../../../../src/errors/assertsError';
import { keepUnused } from '../../../../src/utils/organization/keepUnused';

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
};

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

    try {
        // 1. Try to resolve locally using collection if possible
        // This is an optimization for internal agents
        // We assume the URL might be relative or contain the agent name, or we just check if it's a full URL
        // If it's a full URL, we need to check if it matches our server, but without knowing our server URL it's hard.
        // So we might need to parse the URL to extract agent name if it matches expected pattern.
        // For now, let's rely on fetch for external and check collection if it looks like a local reference (though FROM expects URL)

        // If the URL is valid, we try to fetch it
        // TODO: Handle authentication/tokens for private agents if needed

        // TODO: [🧠] Do this logic more robustly
        let agentBookUrl: string = agentIdentification;
        if (!agentBookUrl.endsWith('/api/book') && !agentBookUrl.endsWith('.book') && !agentBookUrl.endsWith('.md')) {
            // Note: [🕺] Fetching the `/agents/[agentName]/api/book` endpoint for agent source
            agentBookUrl = `${agentBookUrl.replace(/\/$/, '')}/api/book?recursionLevel=${recursionLevel + 1}`;
        }

        const response: Response = await fetch(agentBookUrl);

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

        // We assume the response is the agent source text
        // TODO: Handle content negotiation or JSON responses if the server returns JSON
        const contentType: string | null = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data: TODO_any = await response.json();
            // Assume some structure or that the API returns source in a property
            // For Agents Server API modelRequirements/route.ts returns AgentModelRequirements, not source.
            // If we point to a raw source endpoint, it returns text.
            // If we point to the agent page, it returns HTML.
            // We need a standard way to get source.
            // For now, let's assume the URL points to the source or an API returning source.
            if (typeof data === 'string') {
                return data as string_book;
            } else if (data.source) {
                return data.source as string_book;
            } else {
                // Fallback or error
                console.warn(
                    `Received JSON from ${agentIdentification} but couldn't determine source property. Using text.`,
                );
                // Re-fetch as text? Or assume body text was read? response.json() consumes body.
                // So we might have failed here.
                throw new Error(`Received JSON from ${agentIdentification} but structure is unknown.`);
            }
        } else {
            return (await response.text()) as string_book;
        }
    } catch (error) {
        assertsError(error);

        error.message = `Failed to import agent from "${agentIdentification}"` + '\n\n' + error.message;
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

/**
 * TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
 * TODO: [🐱‍🚀][🏠] Implement local requesting agents by name and permanent ID
 */
