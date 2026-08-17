/**
 * Category of one external source an answered agent message touched.
 *
 * -   `integration` is a third-party service reached through an integration, for example Gmail.
 * -   `website` is a concrete web address the agent fetched or browsed.
 * -   `search` is a lookup the agent ran against a web search engine.
 *
 * @private internal type of the agent-message runtime
 */
export type AgentMessageTouchedExternalSourceKind = 'integration' | 'website' | 'search';

/**
 * One source outside the agent itself which answering a single message viewed or edited.
 *
 * Everything the agent does inside its own folder stays internal and is never described here;
 * this records only the reach beyond it, so a chat can tell which outside services and websites
 * one answer really involved.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private internal type of the agent-message runtime
 */
export type AgentMessageTouchedExternalSource = {
    /**
     * Category of the touched source.
     */
    readonly kind: AgentMessageTouchedExternalSourceKind;

    /**
     * User-facing name of the source, for example `Gmail`, `example.com` or the search query.
     */
    readonly name: string;

    /**
     * Address of the source, when the touch names a concrete one.
     */
    readonly url?: string;
};

/**
 * Validates one already-parsed JSON value as a touched external source.
 *
 * @param value - Raw serialized source.
 * @returns The typed source, or `null` when the value does not match the expected shape, so
 * consumers can silently skip foreign or malformed entries.
 *
 * @private internal utility of the agent-message runtime
 */
export function normalizeAgentMessageTouchedExternalSource(value: unknown): AgentMessageTouchedExternalSource | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Partial<AgentMessageTouchedExternalSource>;
    if (!isAgentMessageTouchedExternalSourceKind(candidate.kind)) {
        return null;
    }

    if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
        return null;
    }

    return {
        kind: candidate.kind,
        name: candidate.name.trim(),
        ...(typeof candidate.url === 'string' && candidate.url.trim().length > 0 ? { url: candidate.url.trim() } : {}),
    };
}

/**
 * Checks that one value is a known external source category.
 *
 * @param value - Raw serialized kind.
 * @returns Whether the value names one of the supported categories.
 *
 * @private internal helper of `normalizeAgentMessageTouchedExternalSource`
 */
function isAgentMessageTouchedExternalSourceKind(value: unknown): value is AgentMessageTouchedExternalSourceKind {
    return value === 'integration' || value === 'website' || value === 'search';
}
