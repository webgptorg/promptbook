/**
 * Visual icon identifiers used by the global Agents Server search UI.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchResultIcon =
    | 'agent'
    | 'book'
    | 'federated-agent'
    | 'folder'
    | 'conversation'
    | 'documentation'
    | 'metadata'
    | 'user'
    | 'message'
    | 'file'
    | 'image'
    | 'system';

/**
 * Unified search result shape returned by all server search providers.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchResultItem = {
    /**
     * Stable identifier for the result item.
     */
    readonly id: string;

    /**
     * Search-provider identifier that produced this result.
     */
    readonly providerId: string;

    /**
     * Category label used for grouping in the UI.
     */
    readonly group: string;

    /**
     * Result entity type used for analytics and rendering.
     */
    readonly type: string;

    /**
     * Visual icon identifier rendered next to the item.
     */
    readonly icon: ServerSearchResultIcon;

    /**
     * Primary display label.
     */
    readonly title: string;

    /**
     * Context snippet around the matched content.
     */
    readonly snippet: string;

    /**
     * Target URL to navigate to when selected.
     */
    readonly href: string;

    /**
     * Ranking score used by the aggregated provider.
     */
    readonly score: number;

    /**
     * Marks external URLs that should not use in-app route transitions.
     */
    readonly isExternal?: boolean;
};

/**
 * JSON payload returned by `/api/search`.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchResponse = {
    /**
     * Original search query used by the server.
     */
    readonly query: string;

    /**
     * Flattened, ranked result list.
     */
    readonly items: ReadonlyArray<ServerSearchResultItem>;

    /**
     * Total number of deduplicated items that match the query before pagination.
     */
    readonly totalCount: number;

    /**
     * Pagination offset (zero-based) applied to the current response.
     */
    readonly offset: number;

    /**
     * Limit used to slice the results that were returned.
     */
    readonly limit: number;
};
