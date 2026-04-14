'use client';

import { toPng, toSvg } from 'html-to-image';
import { useCallback, type MutableRefObject } from 'react';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { buildAsciiGraph, type GraphData, type ServerGroup } from './buildGraphData';

/**
 * Prefix used in graph export filenames.
 *
 * @private function of AgentsGraph
 */
const GRAPH_DOWNLOAD_PREFIX = 'agents-graph';

/**
 * Canvas background color used in PNG/SVG exports.
 *
 * @private function of AgentsGraph
 */
const GRAPH_EXPORT_BACKGROUND = '#f8fafc';

/**
 * Arguments required to export a rendered graph image.
 *
 * @private function of AgentsGraph
 */
type ExportGraphImageProps = {
    extension: 'png' | 'svg';
    graphWrapperElement: HTMLDivElement;
    createDataUrl: (graphWrapperElement: HTMLDivElement) => Promise<string>;
    failureMessage: string;
};

/**
 * Inputs consumed by the private graph-download hook.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphDownloadStateProps = {
    readonly graphData: GraphData;
    readonly graphWrapperRef: MutableRefObject<HTMLDivElement | null>;
    readonly serverGroups: ServerGroup[];
};

/**
 * Download handlers returned to the private graph facade.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphDownloadStateResult = {
    readonly isDownloadAvailable: boolean;
    readonly handleDownloadPng: () => Promise<void>;
    readonly handleDownloadSvg: () => Promise<void>;
    readonly handleDownloadAscii: () => void;
};

/**
 * Build a timestamped filename for graph downloads.
 *
 * @private function of AgentsGraph
 */
function buildGraphFilename(extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    return `${GRAPH_DOWNLOAD_PREFIX}-${timestamp}.${extension}`;
}

/**
 * Trigger a browser download for the provided blob payload.
 *
 * @private function of AgentsGraph
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Convert a data URL into a blob.
 *
 * @private function of AgentsGraph
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

/**
 * Determine whether a DOM node should be included in image exports.
 *
 * @private function of AgentsGraph
 */
function shouldExportNode(node: HTMLElement): boolean {
    if (node.dataset?.exportExclude === 'true') {
        return false;
    }

    if (node.classList?.contains('react-flow__panel')) {
        return false;
    }

    return true;
}

/**
 * Build the PNG data URL for the rendered graph.
 *
 * @private function of AgentsGraph
 */
function buildPngGraphDataUrl(graphWrapperElement: HTMLDivElement): Promise<string> {
    return toPng(graphWrapperElement, {
        backgroundColor: GRAPH_EXPORT_BACKGROUND,
        filter: (node) => shouldExportNode(node as HTMLElement),
        pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    });
}

/**
 * Build the SVG data URL for the rendered graph.
 *
 * @private function of AgentsGraph
 */
function buildSvgGraphDataUrl(graphWrapperElement: HTMLDivElement): Promise<string> {
    return toSvg(graphWrapperElement, {
        backgroundColor: GRAPH_EXPORT_BACKGROUND,
        filter: (node) => shouldExportNode(node as HTMLElement),
    });
}

/**
 * Export the current graph image and surface a targeted error when it fails.
 *
 * @private function of AgentsGraph
 */
async function exportGraphImage({
    extension,
    graphWrapperElement,
    createDataUrl,
    failureMessage,
}: ExportGraphImageProps): Promise<void> {
    try {
        const dataUrl = await createDataUrl(graphWrapperElement);
        const blob = await dataUrlToBlob(dataUrl);
        triggerBlobDownload(blob, buildGraphFilename(extension));
    } catch (error) {
        console.error(`Failed to export graph as ${extension.toUpperCase()}.`, error);
        await showAlert({
            title: 'Export failed',
            message: failureMessage,
        }).catch(() => undefined);
    }
}

/**
 * Compose download/export handlers so graph exporting stays separate from graph layout state.
 *
 * @param props - Current graph data, grouping, and canvas ref.
 * @returns Download availability and file-export handlers for the graph toolbar.
 *
 * @private function of AgentsGraph
 */
export function useAgentsGraphDownloadState(
    props: UseAgentsGraphDownloadStateProps,
): UseAgentsGraphDownloadStateResult {
    const { graphData, graphWrapperRef, serverGroups } = props;
    const isDownloadAvailable = graphData.nodes.length > 0;

    const handleDownloadPng = useCallback(async () => {
        const graphWrapperElement = graphWrapperRef.current;
        if (!graphWrapperElement) {
            return;
        }

        await exportGraphImage({
            extension: 'png',
            graphWrapperElement,
            createDataUrl: buildPngGraphDataUrl,
            failureMessage: 'Failed to export PNG. Try downloading the SVG instead.',
        });
    }, [graphWrapperRef]);

    const handleDownloadSvg = useCallback(async () => {
        const graphWrapperElement = graphWrapperRef.current;
        if (!graphWrapperElement) {
            return;
        }

        await exportGraphImage({
            extension: 'svg',
            graphWrapperElement,
            createDataUrl: buildSvgGraphDataUrl,
            failureMessage: 'Failed to export SVG. Try downloading the PNG instead.',
        });
    }, [graphWrapperRef]);

    const handleDownloadAscii = useCallback(() => {
        const ascii = buildAsciiGraph(graphData, serverGroups);
        const blob = new Blob([ascii], { type: 'text/plain;charset=utf-8' });
        triggerBlobDownload(blob, buildGraphFilename('txt'));
    }, [graphData, serverGroups]);

    return {
        isDownloadAvailable,
        handleDownloadPng,
        handleDownloadSvg,
        handleDownloadAscii,
    };
}
