'use client';

import JSZip from 'jszip';
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import { downloadBlob, parseFilenameFromContentDisposition } from '../../utils/download/browserFileDownload';
import { showAlert, showConfirm, showPrompt } from '../AsyncDialogs/asyncDialogs';

/**
 * Endpoint serving agents-only ZIP exports.
 */
const AGENTS_EXPORT_ENDPOINT = '/api/agents/export';

/**
 * Endpoint accepting dropped agents book/ZIP imports.
 */
const AGENTS_IMPORT_ENDPOINT = '/api/agents/import';

/**
 * Fallback export filename when the response omits a filename.
 */
const DEFAULT_AGENTS_EXPORT_FILENAME = 'promptbook-agents-server.agents.zip';

/**
 * Form field used for uploaded import files.
 */
const FILES_FORM_FIELD = 'files';

/**
 * Form field used for the target folder id.
 */
const TARGET_FOLDER_ID_FORM_FIELD = 'targetFolderId';

/**
 * Form field used for duplicate conflict handling.
 */
const CONFLICT_RESOLUTION_FORM_FIELD = 'conflictResolution';

/**
 * File input accept list for agents imports.
 */
export const AGENTS_IMPORT_FILE_INPUT_ACCEPT = '.book,.zip,application/zip,application/x-zip-compressed';

/**
 * Maximum number of warning or conflict paths shown in dialogs.
 */
const MAX_DIALOG_PATH_COUNT = 6;

/**
 * Successful import response shape.
 */
type AgentsImportSuccessPayload = {
    readonly success: true;
    readonly importedCount: number;
    readonly skippedCount: number;
    readonly ignoredFileCount: number;
    readonly warnings?: ReadonlyArray<AgentsImportWarningPayload>;
};

/**
 * Duplicate conflict response shape.
 */
type AgentsImportConflictPayload = {
    readonly success: false;
    readonly code: 'agent_import_conflicts';
    readonly message?: string;
    readonly conflicts: ReadonlyArray<AgentsImportConflictPayloadItem>;
    readonly warnings?: ReadonlyArray<AgentsImportWarningPayload>;
    readonly ignoredFileCount?: number;
};

/**
 * Minimal import error response shape.
 */
type AgentsImportErrorPayload = {
    readonly error?: string;
    readonly message?: string;
};

/**
 * Warning payload returned by the agents import API.
 */
type AgentsImportWarningPayload = {
    readonly path: string;
    readonly message: string;
};

/**
 * Duplicate conflict payload returned by the agents import API.
 */
type AgentsImportConflictPayloadItem = {
    readonly agentName: string;
    readonly path: string;
    readonly existingDifferentBookCount: number;
};

/**
 * Duplicate conflict handling accepted by the import API.
 */
type AgentsImportConflictResolution = 'ASK' | 'SKIP' | 'DUPLICATE';

/**
 * Hook options for Agents list import/export behavior.
 */
type UseAgentsListImportExportStateOptions = {
    /**
     * Current folder selected in the Agents list.
     */
    readonly currentFolderId: number | null;
    /**
     * Refreshes the organization snapshot after a successful mutation.
     */
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Hook state and handlers for Agents list import/export behavior.
 */
type UseAgentsListImportExportStateResult = {
    readonly importFileInputRef: RefObject<HTMLInputElement | null>;
    readonly handleAgentsExport: () => Promise<void>;
    readonly handleAgentsImportClick: () => void;
    readonly handleAgentsImportFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
    readonly handleAgentsFileDragEnter: (event: DragEvent<HTMLElement>) => void;
    readonly handleAgentsFileDragLeave: (event: DragEvent<HTMLElement>) => void;
    readonly handleAgentsFileDragOver: (event: DragEvent<HTMLElement>) => void;
    readonly handleAgentsFileDrop: (event: DragEvent<HTMLElement>) => Promise<void>;
    readonly isAgentsExporting: boolean;
    readonly isAgentsImportDragActive: boolean;
    readonly isAgentsImporting: boolean;
};

/**
 * Owns agents import/export browser interactions for `AgentsList`.
 *
 * @param options - Current folder and synchronization callback.
 * @returns Import/export handlers and state.
 *
 * @private function of AgentsList
 */
export function useAgentsListImportExportState({
    currentFolderId,
    synchronizeAfterMutation,
}: UseAgentsListImportExportStateOptions): UseAgentsListImportExportStateResult {
    const importFileInputRef = useRef<HTMLInputElement | null>(null);
    const dragDepthRef = useRef(0);
    const [isAgentsExporting, setIsAgentsExporting] = useState(false);
    const [isAgentsImporting, setIsAgentsImporting] = useState(false);
    const [isAgentsImportDragActive, setIsAgentsImportDragActive] = useState(false);

    const handleAgentsExport = useCallback(async () => {
        if (isAgentsExporting) {
            return;
        }

        setIsAgentsExporting(true);

        try {
            const response = await fetch(AGENTS_EXPORT_ENDPOINT, { method: 'GET' });
            if (!response.ok) {
                throw new Error(await resolveAgentsTransferErrorMessage(response, 'Failed to export agents.'));
            }

            const filename =
                parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
                DEFAULT_AGENTS_EXPORT_FILENAME;

            downloadBlob(await response.blob(), filename);
        } catch (error) {
            await showAlert({
                title: 'Export failed',
                message: error instanceof Error ? error.message : 'Failed to export agents.',
            }).catch(() => undefined);
        } finally {
            setIsAgentsExporting(false);
        }
    }, [isAgentsExporting]);

    const importAgentsFiles = useCallback(
        async (files: ReadonlyArray<File>) => {
            if (isAgentsImporting || files.length === 0) {
                return;
            }

            const isConfirmed = await confirmNonBookZipEntries(files);
            if (!isConfirmed) {
                return;
            }

            setIsAgentsImporting(true);

            try {
                const initialResponse = await uploadAgentsImportFiles({
                    files,
                    targetFolderId: currentFolderId,
                    conflictResolution: 'ASK',
                });

                if (initialResponse.status === 409) {
                    const conflictPayload = (await initialResponse.json()) as AgentsImportConflictPayload;
                    const conflictResolution = await promptAgentsImportConflictResolution(conflictPayload.conflicts);
                    if (!conflictResolution) {
                        return;
                    }

                    const resolvedResponse = await uploadAgentsImportFiles({
                        files,
                        targetFolderId: currentFolderId,
                        conflictResolution,
                    });
                    await handleAgentsImportResponse(resolvedResponse, synchronizeAfterMutation);
                    return;
                }

                await handleAgentsImportResponse(initialResponse, synchronizeAfterMutation);
            } catch (error) {
                await showAlert({
                    title: 'Import failed',
                    message: error instanceof Error ? error.message : 'Failed to import agents.',
                }).catch(() => undefined);
            } finally {
                setIsAgentsImporting(false);
            }
        },
        [currentFolderId, isAgentsImporting, synchronizeAfterMutation],
    );

    const handleAgentsImportClick = useCallback(() => {
        if (isAgentsImporting) {
            return;
        }

        importFileInputRef.current?.click();
    }, [isAgentsImporting]);

    const handleAgentsImportFileChange = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            await importAgentsFiles(files);

            if (importFileInputRef.current) {
                importFileInputRef.current.value = '';
            }
        },
        [importAgentsFiles],
    );

    const handleAgentsFileDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
        if (!isFileDragEvent(event)) {
            return;
        }

        event.preventDefault();
        dragDepthRef.current += 1;
        setIsAgentsImportDragActive(true);
    }, []);

    const handleAgentsFileDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
        if (!isFileDragEvent(event)) {
            return;
        }

        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
            setIsAgentsImportDragActive(false);
        }
    }, []);

    const handleAgentsFileDragOver = useCallback((event: DragEvent<HTMLElement>) => {
        if (!isFileDragEvent(event)) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleAgentsFileDrop = useCallback(
        async (event: DragEvent<HTMLElement>) => {
            if (!isFileDragEvent(event)) {
                return;
            }

            event.preventDefault();
            dragDepthRef.current = 0;
            setIsAgentsImportDragActive(false);

            await importAgentsFiles(Array.from(event.dataTransfer.files || []));
        },
        [importAgentsFiles],
    );

    return {
        importFileInputRef,
        handleAgentsExport,
        handleAgentsImportClick,
        handleAgentsImportFileChange,
        handleAgentsFileDragEnter,
        handleAgentsFileDragLeave,
        handleAgentsFileDragOver,
        handleAgentsFileDrop,
        isAgentsExporting,
        isAgentsImportDragActive,
        isAgentsImporting,
    };
}

/**
 * Uploads selected files to the agents import endpoint.
 *
 * @param options - Files, target folder, and duplicate behavior.
 * @returns Fetch response.
 */
async function uploadAgentsImportFiles(options: {
    readonly files: ReadonlyArray<File>;
    readonly targetFolderId: number | null;
    readonly conflictResolution: AgentsImportConflictResolution;
}): Promise<Response> {
    const formData = new FormData();

    for (const file of options.files) {
        formData.append(FILES_FORM_FIELD, file);
    }

    formData.append(TARGET_FOLDER_ID_FORM_FIELD, options.targetFolderId === null ? 'null' : String(options.targetFolderId));
    formData.append(CONFLICT_RESOLUTION_FORM_FIELD, options.conflictResolution);

    return fetch(AGENTS_IMPORT_ENDPOINT, {
        method: 'POST',
        body: formData,
    });
}

/**
 * Handles a final agents import response.
 *
 * @param response - Final import response.
 * @param synchronizeAfterMutation - Organization snapshot refresh callback.
 */
async function handleAgentsImportResponse(
    response: Response,
    synchronizeAfterMutation: (mutationName: string) => void,
): Promise<void> {
    if (!response.ok) {
        throw new Error(await resolveAgentsTransferErrorMessage(response, 'Failed to import agents.'));
    }

    const payload = (await response.json()) as AgentsImportSuccessPayload;
    if (payload.importedCount > 0) {
        synchronizeAfterMutation('import-agents');
    }

    await showAlert({
        title: 'Import complete',
        message: createAgentsImportSuccessMessage(payload),
    }).catch(() => undefined);
}

/**
 * Creates a concise import success message.
 *
 * @param payload - Successful import payload.
 * @returns Dialog message.
 */
function createAgentsImportSuccessMessage(payload: AgentsImportSuccessPayload): string {
    const parts = [`Imported ${payload.importedCount} agents.`];

    if (payload.skippedCount > 0) {
        parts.push(`Skipped ${payload.skippedCount} duplicates.`);
    }

    if (payload.ignoredFileCount > 0) {
        parts.push(`Ignored ${payload.ignoredFileCount} non-book files.`);
    }

    if (payload.warnings && payload.warnings.length > 0) {
        parts.push(createWarningListMessage(payload.warnings.map((warning) => warning.path)));
    }

    return parts.join('\n\n');
}

/**
 * Prompts the user for duplicate conflict behavior.
 *
 * @param conflicts - Duplicate conflicts returned by the import API.
 * @returns Selected conflict resolution, or `null` when cancelled.
 */
async function promptAgentsImportConflictResolution(
    conflicts: ReadonlyArray<AgentsImportConflictPayloadItem>,
): Promise<Exclude<AgentsImportConflictResolution, 'ASK'> | null> {
    const decision = await showPrompt({
        title: 'Duplicate agents',
        message: [
            'Some dropped books have the same agent name as existing agents but different book source.',
            'Type `duplicate` to import them as additional agents, or `skip` to skip the conflicting books.',
            createWarningListMessage(conflicts.map((conflict) => `${conflict.agentName}: ${conflict.path}`)),
        ].join('\n\n'),
        inputLabel: 'Decision',
        defaultValue: 'skip',
        placeholder: 'duplicate or skip',
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
    }).catch(() => '');

    const normalizedDecision = decision.trim().toLowerCase();
    if (normalizedDecision === 'duplicate') {
        return 'DUPLICATE';
    }

    if (normalizedDecision === 'skip') {
        return 'SKIP';
    }

    if (normalizedDecision) {
        await showAlert({
            title: 'Import cancelled',
            message: 'Duplicate decision must be `duplicate` or `skip`.',
        }).catch(() => undefined);
    }

    return null;
}

/**
 * Warns when ZIP files contain non-book entries.
 *
 * @param files - Selected files.
 * @returns Whether import should continue.
 */
async function confirmNonBookZipEntries(files: ReadonlyArray<File>): Promise<boolean> {
    const nonBookZipEntryPaths = await collectNonBookZipEntryPaths(files);
    if (nonBookZipEntryPaths.length === 0) {
        return true;
    }

    return showConfirm({
        title: 'Import agents',
        message: [
            'The ZIP archive contains files that are not `.book` files. They will be ignored.',
            createWarningListMessage(nonBookZipEntryPaths),
        ].join('\n\n'),
        confirmLabel: 'Import agents',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Collects non-book file paths from selected ZIP archives.
 *
 * @param files - Selected files.
 * @returns Non-book ZIP entry paths.
 */
async function collectNonBookZipEntryPaths(files: ReadonlyArray<File>): Promise<string[]> {
    const nonBookZipEntryPaths: string[] = [];

    for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.zip')) {
            continue;
        }

        try {
            const zip = await JSZip.loadAsync(await file.arrayBuffer());
            for (const zipEntry of Object.values(zip.files)) {
                if (!zipEntry.dir && !zipEntry.name.toLowerCase().endsWith('.book')) {
                    nonBookZipEntryPaths.push(`${file.name}/${zipEntry.name}`);
                }
            }
        } catch {
            // Let the server return the authoritative ZIP parse error during import.
        }
    }

    return nonBookZipEntryPaths;
}

/**
 * Creates a shortened path list for dialogs.
 *
 * @param paths - File paths.
 * @returns Human-readable path list.
 */
function createWarningListMessage(paths: ReadonlyArray<string>): string {
    const visiblePaths = paths.slice(0, MAX_DIALOG_PATH_COUNT);
    const remainingCount = paths.length - visiblePaths.length;
    const visibleMessage = visiblePaths.map((path) => `- ${path}`).join('\n');

    if (remainingCount <= 0) {
        return visibleMessage;
    }

    return `${visibleMessage}\n- and ${remainingCount} more`;
}

/**
 * Reads a user-facing transfer error message from a failed response.
 *
 * @param response - Failed response.
 * @param fallbackMessage - Fallback message.
 * @returns User-facing message.
 */
async function resolveAgentsTransferErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    try {
        const payload = (await response.json()) as AgentsImportErrorPayload;
        const message = payload.message || payload.error;
        if (message && message.trim().length > 0) {
            return message.trim();
        }
    } catch {
        // Keep fallback when the response body is not JSON.
    }

    return fallbackMessage;
}

/**
 * Checks whether a drag event contains files.
 *
 * @param event - Drag event.
 * @returns `true` when files are being dragged.
 */
function isFileDragEvent(event: DragEvent<HTMLElement>): boolean {
    return Array.from(event.dataTransfer.types || []).includes('Files');
}
