'use client';

import type { AgentBasicInformation } from '@promptbook-local/types';
import { useCallback, useEffect, useState } from 'react';
import { downloadBlob, parseFilenameFromContentDisposition } from '../../../../utils/download/browserFileDownload';
import type { Transpiler } from './Transpiler';

/**
 * Minimal payload returned by the transpiler-list endpoint.
 *
 * @private type of `useAgentCodeExportState`
 */
type TranspilerListResponse = {
    readonly transpilers?: Array<Transpiler>;
};

/**
 * Result returned by the transpilation endpoint.
 *
 * @private type of `useAgentCodeExportState`
 */
type TranspilationResult = {
    readonly code: string;
    readonly transpiler: Transpiler;
};

/**
 * Minimal API error payload accepted from export endpoints.
 *
 * @private type of `useAgentCodeExportState`
 */
type TranspiledCodeApiErrorPayload = {
    readonly error?: string;
    readonly message?: string;
};

/**
 * State and actions used by the export-as-transpiled-code page client.
 *
 * @private type of `<AgentCodePageClient/>`
 */
export type AgentCodeExportState = {
    readonly agentProfile: AgentBasicInformation | null;
    readonly transpilers: Array<Transpiler>;
    readonly selectedTranspilerName: string;
    readonly selectedTranspiler: Transpiler | null;
    readonly transpiledCode: string;
    readonly isPageLoading: boolean;
    readonly isTranspiling: boolean;
    readonly isDownloading: boolean;
    readonly pageErrorMessage: string | null;
    readonly transpileErrorMessage: string | null;
    readonly downloadErrorMessage: string | null;
    readonly downloadButtonLabel: string;
    readonly isDownloadButtonDisabled: boolean;
    readonly selectTranspiler: (transpilerName: string) => void;
    readonly downloadTranspiledCode: () => Promise<void>;
};

/**
 * Collects the export-as-transpiled-code page state, data loading, and download action behind one focused hook.
 *
 * @param agentName - Routed agent name.
 * @returns State and actions needed to render `<AgentCodePageClient/>`.
 *
 * @private hook of `<AgentCodePageClient/>`
 */
export function useAgentCodeExportState(agentName: string): AgentCodeExportState {
    const agentProfile = useAgentProfile(agentName);
    const { transpilers, selectedTranspilerName, selectTranspiler, isPageLoading, pageErrorMessage } =
        useAgentTranspilers(agentName);
    const { transpiledCode, isTranspiling, transpileErrorMessage } = useTranspiledCode({
        agentName,
        selectedTranspilerName,
    });
    const { isDownloading, downloadErrorMessage, downloadTranspiledCode } = useTranspiledCodeDownload({
        agentName,
        selectedTranspilerName,
    });

    const selectedTranspiler = transpilers.find((transpiler) => transpiler.name === selectedTranspilerName) || null;
    const downloadButtonLabel = isDownloading ? 'Preparing ZIP...' : 'Download ZIP';
    const isDownloadButtonDisabled = !selectedTranspilerName || isPageLoading || isTranspiling || isDownloading;

    return {
        agentProfile,
        transpilers,
        selectedTranspilerName,
        selectedTranspiler,
        transpiledCode,
        isPageLoading,
        isTranspiling,
        isDownloading,
        pageErrorMessage,
        transpileErrorMessage,
        downloadErrorMessage,
        downloadButtonLabel,
        isDownloadButtonDisabled,
        selectTranspiler,
        downloadTranspiledCode,
    };
}

/**
 * Loads the agent profile shown in the export page header.
 *
 * @param agentName - Routed agent name.
 * @returns Loaded agent profile, or `null` while loading or when unavailable.
 *
 * @private hook of `useAgentCodeExportState`
 */
function useAgentProfile(agentName: string): AgentBasicInformation | null {
    const [agentProfile, setAgentProfile] = useState<AgentBasicInformation | null>(null);

    useEffect(() => {
        const abortController = new AbortController();
        let isDisposed = false;

        setAgentProfile(null);

        void (async () => {
            try {
                const profile = await fetchAgentProfile(agentName, abortController.signal);
                if (profile && !isDisposed) {
                    setAgentProfile(profile);
                }
            } catch (error) {
                if (!abortController.signal.aborted) {
                    console.error('Error fetching agent profile:', error);
                }
            }
        })();

        return () => {
            isDisposed = true;
            abortController.abort();
        };
    }, [agentName]);

    return agentProfile;
}

/**
 * Loads the list of transpilers and tracks which one is selected for the current agent.
 *
 * @param agentName - Routed agent name.
 * @returns Transpiler list, selection state, and page-level loading/error state.
 *
 * @private hook of `useAgentCodeExportState`
 */
function useAgentTranspilers(agentName: string): {
    readonly transpilers: Array<Transpiler>;
    readonly selectedTranspilerName: string;
    readonly selectTranspiler: (transpilerName: string) => void;
    readonly isPageLoading: boolean;
    readonly pageErrorMessage: string | null;
} {
    const [transpilers, setTranspilers] = useState<Array<Transpiler>>([]);
    const [selectedTranspilerName, setSelectedTranspilerName] = useState('');
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const abortController = new AbortController();
        let isDisposed = false;

        setIsPageLoading(true);
        setPageErrorMessage(null);
        setTranspilers([]);
        setSelectedTranspilerName('');

        void (async () => {
            try {
                const nextTranspilers = await fetchTranspilerList(agentName, abortController.signal);
                if (isDisposed) {
                    return;
                }

                setTranspilers(nextTranspilers);
                setSelectedTranspilerName(nextTranspilers[0]?.name || '');
            } catch (error) {
                if (abortController.signal.aborted || isDisposed) {
                    return;
                }

                setPageErrorMessage(getErrorMessage(error, 'Failed to load transpilers'));
            } finally {
                if (!isDisposed) {
                    setIsPageLoading(false);
                }
            }
        })();

        return () => {
            isDisposed = true;
            abortController.abort();
        };
    }, [agentName]);

    const selectTranspiler = useCallback((transpilerName: string) => {
        setSelectedTranspilerName(transpilerName);
    }, []);

    return { transpilers, selectedTranspilerName, selectTranspiler, isPageLoading, pageErrorMessage };
}

/**
 * Generates the transpiled code for the selected transpiler.
 *
 * @param options - Routed agent name and selected transpiler name.
 * @returns Generated code plus its loading/error state.
 *
 * @private hook of `useAgentCodeExportState`
 */
function useTranspiledCode(options: { readonly agentName: string; readonly selectedTranspilerName: string }): {
    readonly transpiledCode: string;
    readonly isTranspiling: boolean;
    readonly transpileErrorMessage: string | null;
} {
    const { agentName, selectedTranspilerName } = options;
    const [transpiledCode, setTranspiledCode] = useState('');
    const [isTranspiling, setIsTranspiling] = useState(false);
    const [transpileErrorMessage, setTranspileErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Note: Without a selected transpiler there is nothing to generate, so clear any previous result.
        if (!selectedTranspilerName) {
            setIsTranspiling(false);
            setTranspiledCode('');
            setTranspileErrorMessage(null);
            return;
        }

        const abortController = new AbortController();
        let isDisposed = false;

        setIsTranspiling(true);
        setTranspileErrorMessage(null);
        setTranspiledCode('');

        void (async () => {
            try {
                const code = await fetchTranspiledCode(agentName, selectedTranspilerName, abortController.signal);
                if (!isDisposed) {
                    setTranspiledCode(code);
                }
            } catch (error) {
                if (abortController.signal.aborted || isDisposed) {
                    return;
                }

                setTranspileErrorMessage(getErrorMessage(error, 'Failed to transpile code'));
            } finally {
                if (!isDisposed) {
                    setIsTranspiling(false);
                }
            }
        })();

        return () => {
            isDisposed = true;
            abortController.abort();
        };
    }, [agentName, selectedTranspilerName]);

    return { transpiledCode, isTranspiling, transpileErrorMessage };
}

/**
 * Handles the ZIP download of the selected transpiled harness.
 *
 * @param options - Routed agent name and selected transpiler name.
 * @returns Download state and the action that triggers the browser download.
 *
 * @private hook of `useAgentCodeExportState`
 */
function useTranspiledCodeDownload(options: {
    readonly agentName: string;
    readonly selectedTranspilerName: string;
}): {
    readonly isDownloading: boolean;
    readonly downloadErrorMessage: string | null;
    readonly downloadTranspiledCode: () => Promise<void>;
} {
    const { agentName, selectedTranspilerName } = options;
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadErrorMessage, setDownloadErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Note: A previous download error no longer applies once the agent or selected transpiler changes.
        setDownloadErrorMessage(null);
    }, [agentName, selectedTranspilerName]);

    const downloadTranspiledCode = useCallback(async () => {
        if (!selectedTranspilerName || isDownloading) {
            return;
        }

        setIsDownloading(true);
        setDownloadErrorMessage(null);

        try {
            const { blob, filename } = await fetchTranspiledCodeDownload(agentName, selectedTranspilerName);
            downloadBlob(blob, filename);
        } catch (error) {
            setDownloadErrorMessage(getErrorMessage(error, 'Failed to download ZIP export'));
        } finally {
            setIsDownloading(false);
        }
    }, [agentName, isDownloading, selectedTranspilerName]);

    return { isDownloading, downloadErrorMessage, downloadTranspiledCode };
}

/**
 * Creates the JSON export API path for one agent.
 *
 * @param agentName - Routed agent name.
 * @returns Relative API path used for transpiler listing and code generation.
 *
 * @private function of `useAgentCodeExportState`
 */
function createTranspiledCodeApiPath(agentName: string): string {
    return `/agents/${encodeURIComponent(agentName)}/export-as-transpiled-code/api`;
}

/**
 * Creates the ZIP download API path for one agent and selected transpiler.
 *
 * @param agentName - Routed agent name.
 * @param transpilerName - Selected transpiler identifier.
 * @returns Relative download URL with the selected transpiler encoded in the query string.
 *
 * @private function of `useAgentCodeExportState`
 */
function createTranspiledCodeDownloadApiPath(agentName: string, transpilerName: string): string {
    const searchParams = new URLSearchParams({ transpilerName });
    return `${createTranspiledCodeApiPath(agentName)}/download?${searchParams.toString()}`;
}

/**
 * Reads a user-facing API error from a failed export response.
 *
 * @param response - Failed HTTP response.
 * @param fallbackMessage - Fallback message when the body has no structured error.
 * @returns Friendly error message suitable for rendering in the UI.
 *
 * @private function of `useAgentCodeExportState`
 */
async function resolveTranspiledCodeApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    try {
        const payload = (await response.json()) as TranspiledCodeApiErrorPayload;
        const message = payload.message || payload.error;

        if (message && message.trim().length > 0) {
            return message.trim();
        }
    } catch {
        // Keep the fallback message when the error body is not valid JSON.
    }

    return fallbackMessage;
}

/**
 * Loads the list of transpilers available for the agent export.
 *
 * @param agentName - Routed agent name.
 * @param signal - Abort signal cancelling the request when the effect is disposed.
 * @returns Available transpilers, or an empty list when none are returned.
 *
 * @private function of `useAgentCodeExportState`
 */
async function fetchTranspilerList(agentName: string, signal: AbortSignal): Promise<Array<Transpiler>> {
    const response = await fetch(createTranspiledCodeApiPath(agentName), {
        method: 'GET',
        signal,
    });

    if (!response.ok) {
        throw new Error(await resolveTranspiledCodeApiErrorMessage(response, 'Failed to load transpilers'));
    }

    const payload = (await response.json()) as TranspilerListResponse;
    return payload.transpilers || [];
}

/**
 * Generates the transpiled code for one agent and transpiler.
 *
 * @param agentName - Routed agent name.
 * @param transpilerName - Selected transpiler identifier.
 * @param signal - Abort signal cancelling the request when the effect is disposed.
 * @returns Generated harness code.
 *
 * @private function of `useAgentCodeExportState`
 */
async function fetchTranspiledCode(agentName: string, transpilerName: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(createTranspiledCodeApiPath(agentName), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transpilerName }),
        signal,
    });

    if (!response.ok) {
        throw new Error(await resolveTranspiledCodeApiErrorMessage(response, 'Failed to transpile code'));
    }

    const result = (await response.json()) as TranspilationResult;
    return result.code;
}

/**
 * Downloads the ZIP export for one agent and transpiler.
 *
 * @param agentName - Routed agent name.
 * @param transpilerName - Selected transpiler identifier.
 * @returns Download blob and its resolved filename.
 *
 * @private function of `useAgentCodeExportState`
 */
async function fetchTranspiledCodeDownload(
    agentName: string,
    transpilerName: string,
): Promise<{ readonly blob: Blob; readonly filename: string }> {
    const response = await fetch(createTranspiledCodeDownloadApiPath(agentName, transpilerName), {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await resolveTranspiledCodeApiErrorMessage(response, 'Failed to download ZIP export'));
    }

    const filename =
        parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
        'promptbook-agent-export.zip';
    const blob = await response.blob();

    return { blob, filename };
}

/**
 * Loads the agent profile for the export header, returning `null` when unavailable.
 *
 * @param agentName - Routed agent name.
 * @param signal - Abort signal cancelling the request when the effect is disposed.
 * @returns Loaded agent profile, or `null` when the profile endpoint responds with an error status.
 *
 * @private function of `useAgentCodeExportState`
 */
async function fetchAgentProfile(agentName: string, signal: AbortSignal): Promise<AgentBasicInformation | null> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/profile`, {
        method: 'GET',
        signal,
    });

    if (!response.ok) {
        return null;
    }

    return (await response.json()) as AgentBasicInformation;
}

/**
 * Extracts a user-facing message from an unknown caught value.
 *
 * @param error - Unknown caught value.
 * @param fallbackMessage - Message used when the caught value is not an `Error`.
 * @returns Human-readable error message.
 *
 * @private function of `useAgentCodeExportState`
 */
function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}
