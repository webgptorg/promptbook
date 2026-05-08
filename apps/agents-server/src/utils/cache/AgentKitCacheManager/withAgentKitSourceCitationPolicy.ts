import { spaceTrim } from 'spacetrim';

/**
 * Marker used to avoid appending the same citation policy block multiple times.
 *
 * @private function of AgentKitCacheManager
 */
const SOURCE_CITATION_POLICY_SENTINEL = 'Source citation policy:';

/**
 * Tool names where source-backed responses should include citations.
 *
 * @private function of AgentKitCacheManager
 */
const SOURCE_CITATION_TOOL_NAMES = new Set([
    'knowledge_search',
    'web_search',
    'deep_search',
    'fetch_url_content',
    'run_browser',
]);

/**
 * Minimal shape needed to inspect tool names for citation policy decisions.
 *
 * @private function of AgentKitCacheManager
 */
type CitationAwareToolDefinition = {
    readonly name: string;
};

/**
 * Appends the shared citation policy for source-backed AgentKit responses.
 *
 * @private function of AgentKitCacheManager
 */
export function withAgentKitSourceCitationPolicy(
    baseInstructions: string,
    options: {
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly tools: ReadonlyArray<CitationAwareToolDefinition> | undefined;
    },
): string {
    const { knowledgeSources, tools } = options;
    const shouldEnforceSourceCitations =
        knowledgeSources.length > 0 || hasSourceCitationSensitiveTools(tools);

    if (!shouldEnforceSourceCitations) {
        return baseInstructions;
    }

    if (baseInstructions.includes(SOURCE_CITATION_POLICY_SENTINEL)) {
        return baseInstructions;
    }

    const citationPolicy = spaceTrim(
        `
            ${SOURCE_CITATION_POLICY_SENTINEL}
            - When an answer relies on knowledge sources or web/browser tool results, include source citations.
            - Use citation markers returned by the tools in the answer body (for example: \`[0:0]\` or \u30104:0\u2020source\u3011).
            - Do not present source-backed factual claims without citations.
            - If no external source was used, state that clearly instead of inventing citations.
        `,
    );

    return baseInstructions ? `${baseInstructions}\n\n${citationPolicy}` : citationPolicy;
}

/**
 * Returns true when the tool list includes tools that usually produce source-backed answers.
 *
 * @private function of AgentKitCacheManager
 */
function hasSourceCitationSensitiveTools(tools: ReadonlyArray<CitationAwareToolDefinition> | undefined): boolean {
    if (!tools || tools.length === 0) {
        return false;
    }

    return tools.some((tool) => SOURCE_CITATION_TOOL_NAMES.has(tool.name));
}
