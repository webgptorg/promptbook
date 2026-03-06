import type { GraphData, GraphLink, ServerGroup } from './AgentsGraph.types';
import { EDGE_LABELS } from './graphConstants';

const GRAPH_DOWNLOAD_PREFIX = 'agents-graph';
const GRAPH_POSITIONS_STORAGE_KEY = 'agents-graph-positions-v1';
const GRAPH_EXPORT_BACKGROUND = '#f8fafc';

/**
 * Build a timestamped filename for graph downloads.
 */
export const buildGraphFilename = (extension: string): string => {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    return `${GRAPH_DOWNLOAD_PREFIX}-${timestamp}.${extension}`;
};

/**
 * Trigger a browser download for the provided blob payload.
 */
export const triggerBlobDownload = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/**
 * Build the storage key for graph positions.
 */
export const buildPositionsStorageKey = (publicUrl: string): string => {
    const normalized = publicUrl.replace(/\/$/, '');
    return `${GRAPH_POSITIONS_STORAGE_KEY}:${normalized}`;
};

/**
 * Load node positions from local storage.
 */
export const loadStoredPositions = (storageKey: string): Record<string, { x: number; y: number; parentId: string }> => {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as Record<string, { x: number; y: number; parentId: string }>;
        return parsed || {};
    } catch (error) {
        return {};
    }
};

/**
 * Persist node positions to local storage.
 */
export const saveStoredPositions = (storageKey: string, positions: Record<string, { x: number; y: number; parentId: string }>): void => {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(positions));
    } catch (error) {
        console.warn('Failed to save graph positions.', error);
    }
};

/**
 * Convert a data URL into a blob.
 */
export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
};

/**
 * Determine whether a DOM node should be included in exports.
 */
export const shouldExportNode = (node: HTMLElement): boolean => {
    if (node.dataset?.exportExclude === 'true') {
        return false;
    }

    if (node.classList?.contains('react-flow__panel')) {
        return false;
    }

    return true;
};

/**
 * Build a readable ASCII summary of the graph.
 */
export const buildAsciiGraph = (graphData: GraphData, serverGroups: ServerGroup[]): string => {
    const lines: string[] = [];
    const nodeNameById = new Map(graphData.nodes.map((node) => [node.id, node.name]));

    serverGroups.forEach((serverGroup) => {
        lines.push(`Server: ${serverGroup.label}`);
        serverGroup.folders.forEach((folder) => {
            lines.push(`  Folder: ${folder.label}`);
            folder.agents.forEach((agent) => {
                const orderIndex = graphData.orderIndexByNodeId.get(agent.id);
                const orderLabel = orderIndex ? `#${orderIndex} ` : '';
                lines.push(`    ${orderLabel}${agent.name}`);
            });
        });
        lines.push('');
    });

    if (graphData.links.length > 0) {
        lines.push('Relationships:');
        graphData.links.forEach((link) => {
            const source = nodeNameById.get(link.source) || link.source;
            const target = nodeNameById.get(link.target) || link.target;
            lines.push(`  ${source} --${EDGE_LABELS[link.type]}--> ${target}`);
        });
        lines.push('');
    }

    if (graphData.orderLinks.length > 0) {
        lines.push('Folder order:');
        graphData.orderLinks.forEach((link) => {
            const source = nodeNameById.get(link.source) || link.source;
            const target = nodeNameById.get(link.target) || link.target;
            lines.push(`  ${source} -> ${target}`);
        });
    }

    return lines.join('\\n');
};

/**
 * Background color used for exported images.
 */
export const exportBackground = GRAPH_EXPORT_BACKGROUND;
