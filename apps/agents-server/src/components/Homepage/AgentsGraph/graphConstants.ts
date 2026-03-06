import type { GraphLinkKind } from './AgentsGraph.types';

/**
 * Styling configuration for the different graph connection types.
 */
export const EDGE_STYLES: Record<GraphLinkKind, { color: string; width: number; dash?: string }> = {
    inheritance: { color: '#38bdf8', width: 1.6, dash: '6 6' },
    import: { color: '#94a3b8', width: 1.25 },
    team: { color: '#34d399', width: 2.5 },
    order: { color: '#f59e0b', width: 1.1, dash: '2 6' },
};

/**
 * Human-friendly labels for each graph connection type.
 */
export const EDGE_LABELS: Record<GraphLinkKind, string> = {
    inheritance: 'Parent',
    import: 'Import',
    team: 'Team',
    order: 'Folder order',
};
