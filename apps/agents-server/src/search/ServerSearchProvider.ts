import type { UserInfo } from '../utils/getCurrentUser';
import type { ServerSearchResultItem } from './ServerSearchResultItem';

/**
 * Runtime context passed to every global-search provider.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchProviderContext = {
    /**
     * Raw search query.
     */
    readonly query: string;

    /**
     * Maximum number of items each provider should return before aggregation.
     */
    readonly limitPerProvider: number;

    /**
     * Whether the current requester has admin privileges.
     */
    readonly isAdmin: boolean;

    /**
     * Current user snapshot when authenticated.
     */
    readonly currentUser: UserInfo | null;
};

/**
 * Pluggable provider contract for one searchable domain.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type ServerSearchProvider = {
    /**
     * Unique provider id.
     */
    readonly id: string;

    /**
     * Human-friendly label used for diagnostics.
     */
    readonly label: string;

    /**
     * Executes provider-specific search and returns unified result items.
     */
    search(context: ServerSearchProviderContext): Promise<ReadonlyArray<ServerSearchResultItem>>;
};
