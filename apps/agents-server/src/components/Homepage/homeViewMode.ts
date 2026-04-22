/**
 * Supported visualization modes for the agents homepage.
 */
export type HomeViewMode = 'LIST' | 'GRAPH' | 'OFFICE' | 'MAZE' | 'PIXEL_OFFICE';

/**
 * Query token used for graph view.
 */
const GRAPH_HOME_VIEW_QUERY = 'graph';

/**
 * Query token used for office view.
 */
const OFFICE_HOME_VIEW_QUERY = 'office';

/**
 * Query token used for maze-office view.
 */
const MAZE_HOME_VIEW_QUERY = 'maze';

/**
 * Query token used for pixel-office view.
 */
const PIXEL_OFFICE_HOME_VIEW_QUERY = 'pixel-office';

/**
 * Mapping between non-list view modes and their query tokens.
 */
const HOME_VIEW_QUERY_BY_MODE: Record<Exclude<HomeViewMode, 'LIST'>, string> = {
    GRAPH: GRAPH_HOME_VIEW_QUERY,
    OFFICE: OFFICE_HOME_VIEW_QUERY,
    MAZE: MAZE_HOME_VIEW_QUERY,
    PIXEL_OFFICE: PIXEL_OFFICE_HOME_VIEW_QUERY,
};

/**
 * Normalizes one raw query value to a single string token.
 *
 * @param value - Raw query value from Next.js search params.
 * @returns Normalized token or null when not set.
 */
function normalizeHomeViewQueryValue(value: string | string[] | null | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] || null;
    }

    return value || null;
}

/**
 * Resolves one homepage view mode from a raw query token.
 *
 * @param value - Raw `view` query token.
 * @returns Resolved mode with list as a safe fallback.
 */
export function resolveHomeViewMode(value: string | null | undefined): HomeViewMode {
    if (value === GRAPH_HOME_VIEW_QUERY) {
        return 'GRAPH';
    }

    if (value === OFFICE_HOME_VIEW_QUERY) {
        return 'OFFICE';
    }

    if (value === MAZE_HOME_VIEW_QUERY) {
        return 'MAZE';
    }

    if (value === PIXEL_OFFICE_HOME_VIEW_QUERY) {
        return 'PIXEL_OFFICE';
    }

    return 'LIST';
}

/**
 * Resolves one homepage view mode directly from a Next.js search-param value.
 *
 * @param value - Raw Next.js `view` param value.
 * @returns Resolved mode with list as a safe fallback.
 */
export function resolveHomeViewModeFromSearchParam(value: string | string[] | undefined): HomeViewMode {
    return resolveHomeViewMode(normalizeHomeViewQueryValue(value));
}

/**
 * Converts one view mode back into its URL query token.
 *
 * @param mode - View mode to encode.
 * @returns Query token or null for list mode.
 */
export function getHomeViewQueryValue(mode: HomeViewMode): string | null {
    if (mode === 'LIST') {
        return null;
    }

    return HOME_VIEW_QUERY_BY_MODE[mode];
}

/**
 * Determines whether one mode should render the list-specific sections.
 *
 * @param mode - Current homepage view mode.
 * @returns True when list mode is active.
 */
export function isHomeListViewMode(mode: HomeViewMode): boolean {
    return mode === 'LIST';
}
