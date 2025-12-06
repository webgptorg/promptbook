import { createAgentModelRequirements } from '@promptbook-local/core';
import type { AgentCollection } from '@promptbook-local/types';
type string_book = string & { readonly __type: 'book' };

/**
 * Resolves agent source with inheritance (FROM commitment)
 *
 * It recursively fetches the parent agent source and merges it with the current source.
 *
 * @param agentSource The initial agent source
 * @param collection Optional agent collection to resolve local agents efficiently
 * @returns The resolved agent source with inheritance applied
 */
export async function resolveInheritedAgentSource(
    agentSource: string_book,
    collection?: AgentCollection,
): Promise<string_book> {
    // Check if the source has FROM commitment
    // We use createAgentModelRequirements to parse commitments
    // Note: We don't provide tools/models here as we only care about parsing commitments
    const requirements = await createAgentModelRequirements(agentSource);

    if (!requirements.parentAgentUrl) {
        return agentSource;
    }

    const parentUrl = requirements.parentAgentUrl;
    let parentSource: string_book;

    try {
        // 1. Try to resolve locally using collection if possible
        // This is an optimization for internal agents
        // We assume the URL might be relative or contain the agent name, or we just check if it's a full URL
        // If it's a full URL, we need to check if it matches our server, but without knowing our server URL it's hard.
        // So we might need to parse the URL to extract agent name if it matches expected pattern.
        // For now, let's rely on fetch for external and check collection if it looks like a local reference (though FROM expects URL)

        // If the URL is valid, we try to fetch it
        // TODO: Handle authentication/tokens for private agents if needed
        const response = await fetch(parentUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch parent agent from ${parentUrl}: ${response.status} ${response.statusText}`);
        }

        // We assume the response is the agent source text
        // TODO: Handle content negotiation or JSON responses if the server returns JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
             const data = await response.json();
             // Assume some structure or that the API returns source in a property
             // For Agents Server API modelRequirements/route.ts returns AgentModelRequirements, not source.
             // If we point to a raw source endpoint, it returns text.
             // If we point to the agent page, it returns HTML.
             // We need a standard way to get source.
                 // For now, let's assume the URL points to the source or an API returning source.
             if (typeof data === 'string') {
                 parentSource = data as string_book;
             } else if (data.source) {
                 parentSource = data.source as string_book;
             } else {
                 // Fallback or error
                 console.warn(`Received JSON from ${parentUrl} but couldn't determine source property. Using text.`);
                 // Re-fetch as text? Or assume body text was read? response.json() consumes body.
                 // So we might have failed here.
                 throw new Error(`Received JSON from ${parentUrl} but structure is unknown.`);
             }
        } else {
            parentSource = (await response.text()) as string_book;
        }

    } catch (error) {
        console.warn(`Failed to resolve parent agent ${parentUrl}`, error);
        // If we fail to resolve parent, we return the original source (maybe with a warning or error commitment?)
        // Or we could throw to fail the build.
        // For robustness, let's append a warning comment
        return `${agentSource}\n\n# Warning: Failed to inherit from ${parentUrl}: ${error}` as string_book;
    }

    // Recursively resolve the parent source
    const effectiveParentSource = await resolveInheritedAgentSource(parentSource, collection);

    // Strip the FROM commitment from the child source to avoid infinite recursion or re-processing
    // We can filter lines starting with FROM
    const childSourceLines = agentSource.split('\n');
    const filteredChildSource = childSourceLines
        .filter((line: string) => !line.trim().startsWith('FROM ')) // Simple string check, ideally should use parser location
        .join('\n');

    // Append child source to parent source
    // "appends the RULE commitment to its source" -> Parent + Child
    return `${effectiveParentSource}\n\n${filteredChildSource}` as string_book;
}
