import type OpenAI from 'openai';
import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Constant for vector store progress log interval min ms.
 */
const VECTOR_STORE_PROGRESS_LOG_INTERVAL_MIN_MS = 15000;

/**
 * Constant for vector store stall log threshold ms.
 */
const VECTOR_STORE_STALL_LOG_THRESHOLD_MS = 30000;

/**
 * Metadata for uploaded knowledge source files used for vector store diagnostics.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchPoller`
 */
type KnowledgeSourceUploadMetadata = {
    readonly fileId: string;
    readonly filename: string;
    readonly sizeBytes?: number;
};

/**
 * Resolved batch identifier used while polling vector store ingestion.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchPoller`
 */
type VectorStoreFileBatchIdResolution = {
    readonly batchId?: string;
    readonly isBatchIdValid: boolean;
    readonly isBatchIdMismatch: boolean;
};

/**
 * Mutable polling state used to throttle progress and diagnostics logging.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchPoller`
 */
type VectorStoreFileBatchPollingState = {
    lastCountsKey: string;
    lastProgressKey: string;
    lastLogAtMs: number;
    lastProgressAtMs: number;
    lastDiagnosticsAtMs: number;
    isBatchIdMismatchLogged: boolean;
    isBatchIdFallbackLogged: boolean;
    isBatchIdInvalidLogged: boolean;
};

/**
 * Retrieved vector store file batch together with the batch-id bookkeeping used for polling.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchPoller`
 */
type RetrievedVectorStoreFileBatch = {
    readonly batch: TODO_any;
    readonly batchId: string;
    readonly isBatchIdMismatch: boolean;
};

/**
 * Returns true when the provided identifier looks like an OpenAI vector-store file-batch id.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchPoller`
 */
function isVectorStoreFileBatchId(batchId: string | undefined): batchId is string {
    return typeof batchId === 'string' && batchId.startsWith('vsfb_');
}

/**
 * Creates the mutable log-throttling state used while polling vector store ingestion.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchPoller`
 */
function createVectorStoreFileBatchPollingState(startedAtMs: number): VectorStoreFileBatchPollingState {
    return {
        lastCountsKey: '',
        lastProgressKey: '',
        lastLogAtMs: 0,
        lastProgressAtMs: startedAtMs,
        lastDiagnosticsAtMs: startedAtMs,
        isBatchIdMismatchLogged: false,
        isBatchIdFallbackLogged: false,
        isBatchIdInvalidLogged: false,
    };
}

/**
 * Polls one vector-store file batch until it settles.
 *
 * @private helper of `OpenAiVectorStoreHandler`
 */
export class OpenAiVectorStoreFileBatchPoller {
    /**
     * Creates one vector-store file-batch poller instance.
     */
    public constructor(
        private readonly options: {
            readonly isVerbose: boolean;
            readonly getVectorStoresApi: (client: OpenAI) => TODO_any;
        },
    ) {}

    /**
     * Polls the created vector-store batch until ingestion completes, fails, or times out.
     */
    public async pollVectorStoreFileBatchUntilSettled(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly batch: TODO_any;
        readonly expectedBatchId: string;
        readonly isExpectedBatchIdValid: boolean;
        readonly uploadedFiles: ReadonlyArray<KnowledgeSourceUploadMetadata>;
        readonly pollIntervalMs: number;
        readonly uploadTimeoutMs: number;
        readonly shouldContinueOnVectorStoreStall: boolean;
        readonly logLabel: string;
    }): Promise<TODO_any> {
        const {
            client,
            vectorStoreId,
            batch,
            expectedBatchId,
            isExpectedBatchIdValid,
            uploadedFiles,
            pollIntervalMs,
            uploadTimeoutMs,
            shouldContinueOnVectorStoreStall,
            logLabel,
        } = options;
        const vectorStores = this.options.getVectorStoresApi(client);
        const pollStartedAtMs = Date.now();
        const progressLogIntervalMs = Math.max(VECTOR_STORE_PROGRESS_LOG_INTERVAL_MIN_MS, pollIntervalMs);
        const diagnosticsIntervalMs = Math.max(60000, pollIntervalMs * 5);
        const pollingState = createVectorStoreFileBatchPollingState(pollStartedAtMs);
        let latestBatch = batch;

        for (;;) {
            const nowMs = Date.now();
            const retrievedBatch = await this.retrieveVectorStoreFileBatchForPolling({
                vectorStores,
                vectorStoreId,
                latestBatch,
                expectedBatchId,
                isExpectedBatchIdValid,
                pollingState,
                logLabel,
            });

            if (!retrievedBatch) {
                return latestBatch;
            }

            latestBatch = retrievedBatch.batch;
            const status = latestBatch.status ?? 'unknown';
            const fileCounts = latestBatch.file_counts ?? {};
            const elapsedMs = nowMs - pollStartedAtMs;

            this.trackVectorStoreFileBatchProgress({
                vectorStoreId,
                batchId: retrievedBatch.batchId,
                status,
                fileCounts,
                elapsedMs,
                progressLogIntervalMs,
                pollingState,
                logLabel,
                nowMs,
            });

            await this.maybeLogStalledVectorStoreFileBatch({
                client,
                vectorStoreId,
                batchId: retrievedBatch.batchId,
                status,
                uploadedFiles,
                diagnosticsIntervalMs,
                pollingState,
                logLabel,
                nowMs,
            });

            if (
                await this.handleVectorStoreFileBatchTerminalState({
                    client,
                    vectorStoreId,
                    batchId: retrievedBatch.batchId,
                    status,
                    fileCounts,
                    uploadedFiles,
                    elapsedMs,
                    logLabel,
                })
            ) {
                return latestBatch;
            }

            if (
                await this.handleVectorStoreFileBatchTimeout({
                    client,
                    vectorStores,
                    vectorStoreId,
                    batchId: retrievedBatch.batchId,
                    isBatchIdMismatch: retrievedBatch.isBatchIdMismatch,
                    expectedBatchId,
                    fileCounts,
                    uploadedFiles,
                    elapsedMs,
                    uploadTimeoutMs,
                    shouldContinueOnVectorStoreStall,
                    logLabel,
                    nowMs,
                    pollStartedAtMs,
                })
            ) {
                return latestBatch;
            }

            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
    }

    /**
     * Logs vector store file batch diagnostics to help trace ingestion stalls or failures.
     */
    private async logVectorStoreFileBatchDiagnostics(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly batchId: string;
        readonly uploadedFiles: ReadonlyArray<KnowledgeSourceUploadMetadata>;
        readonly logLabel: string;
        readonly reason: 'stalled' | 'timeout' | 'failed';
    }): Promise<void> {
        const { client, vectorStoreId, batchId, uploadedFiles, logLabel, reason } = options;

        if (reason === 'stalled' && !this.options.isVerbose) {
            return;
        }

        if (!batchId.startsWith('vsfb_')) {
            console.error('[🤰]', 'Vector store file batch diagnostics skipped (invalid batch id)', {
                vectorStoreId,
                batchId,
                reason,
                logLabel,
            });
            return;
        }

        const fileIdToMetadata = new Map<string, KnowledgeSourceUploadMetadata>();
        for (const file of uploadedFiles) {
            fileIdToMetadata.set(file.fileId, file);
        }

        try {
            const vectorStores = this.options.getVectorStoresApi(client);
            const limit = Math.min(100, Math.max(10, uploadedFiles.length));
            const batchFilesPage = await vectorStores.fileBatches.listFiles(batchId, {
                vector_store_id: vectorStoreId,
                limit,
            });
            const batchFiles = batchFilesPage.data ?? [];
            const statusCounts: Record<string, number> = {
                in_progress: 0,
                completed: 0,
                failed: 0,
                cancelled: 0,
            };
            const errorSamples: Array<{
                fileId: string;
                status?: string;
                error?: string;
                filename?: string;
                vectorStoreFileId?: string;
            }> = [];
            const inProgressSamples: Array<{ fileId: string; filename?: string; vectorStoreFileId?: string }> = [];
            const batchFileIds = new Set<string>();

            for (const file of batchFiles) {
                const status = file.status ?? 'unknown';
                statusCounts[status] = (statusCounts[status] ?? 0) + 1;
                const vectorStoreFileId = file.id;
                const uploadedFileId = (file as TODO_any).file_id ?? (file as TODO_any).fileId;
                const fileId = uploadedFileId ?? vectorStoreFileId;
                batchFileIds.add(fileId);
                const metadata = fileIdToMetadata.get(fileId);

                if (status === 'failed') {
                    errorSamples.push({
                        fileId,
                        status,
                        error: (file as TODO_any).last_error?.message,
                        filename: metadata?.filename,
                        vectorStoreFileId: uploadedFileId ? vectorStoreFileId : undefined,
                    });
                }

                if (status === 'in_progress') {
                    inProgressSamples.push({
                        fileId,
                        filename: metadata?.filename,
                        vectorStoreFileId: uploadedFileId ? vectorStoreFileId : undefined,
                    });
                }
            }

            const missingSamples = uploadedFiles
                .filter((file) => !batchFileIds.has(file.fileId))
                .slice(0, 5)
                .map((file) => ({
                    fileId: file.fileId,
                    filename: file.filename,
                    sizeBytes: file.sizeBytes,
                }));

            const vectorStore = await vectorStores.retrieve(vectorStoreId);
            const logPayload = {
                vectorStoreId,
                batchId,
                reason,
                vectorStoreStatus: vectorStore.status,
                vectorStoreFileCounts: vectorStore.file_counts,
                vectorStoreUsageBytes: vectorStore.usage_bytes,
                batchFileCount: batchFiles.length,
                statusCounts,
                errorSamples: errorSamples.slice(0, 5),
                inProgressSamples,
                missingFileCount: uploadedFiles.length - batchFileIds.size,
                missingSamples,
                logLabel,
            };

            const logFunction = reason === 'stalled' ? console.info : console.error;
            logFunction('[🤰]', 'Vector store file batch diagnostics', logPayload);
        } catch (error) {
            assertsError(error);
            console.error('[🤰]', 'Vector store file batch diagnostics failed', {
                vectorStoreId,
                batchId,
                reason,
                logLabel,
                error: serializeError(error),
            });
        }
    }

    /**
     * Resolves the next batch id to poll and retrieves the freshest OpenAI batch snapshot.
     */
    private async retrieveVectorStoreFileBatchForPolling(options: {
        readonly vectorStores: TODO_any;
        readonly vectorStoreId: string;
        readonly latestBatch: TODO_any;
        readonly expectedBatchId: string;
        readonly isExpectedBatchIdValid: boolean;
        readonly pollingState: VectorStoreFileBatchPollingState;
        readonly logLabel: string;
    }): Promise<RetrievedVectorStoreFileBatch | null> {
        const {
            vectorStores,
            vectorStoreId,
            latestBatch,
            expectedBatchId,
            isExpectedBatchIdValid,
            pollingState,
            logLabel,
        } = options;
        const batchIdResolution = this.resolveVectorStoreFileBatchId({
            vectorStoreId,
            latestBatch,
            expectedBatchId,
            isExpectedBatchIdValid,
            pollingState,
            logLabel,
        });

        if (!batchIdResolution.isBatchIdValid || !batchIdResolution.batchId) {
            return null;
        }

        const batch = await vectorStores.fileBatches.retrieve(batchIdResolution.batchId, {
            vector_store_id: vectorStoreId,
        });

        return {
            batch,
            batchId: batchIdResolution.batchId,
            isBatchIdMismatch: batchIdResolution.isBatchIdMismatch,
        };
    }

    /**
     * Normalizes the batch identifier returned by OpenAI and logs unusual id situations once.
     */
    private resolveVectorStoreFileBatchId(options: {
        readonly vectorStoreId: string;
        readonly latestBatch: TODO_any;
        readonly expectedBatchId: string;
        readonly isExpectedBatchIdValid: boolean;
        readonly pollingState: VectorStoreFileBatchPollingState;
        readonly logLabel: string;
    }): VectorStoreFileBatchIdResolution {
        const { vectorStoreId, latestBatch, expectedBatchId, isExpectedBatchIdValid, pollingState, logLabel } = options;

        const rawBatchId = typeof latestBatch.id === 'string' ? latestBatch.id : '';
        const rawVectorStoreId = (latestBatch as TODO_any).vector_store_id;
        let batchId = rawBatchId;
        let isBatchIdValid = isVectorStoreFileBatchId(batchId);

        if (!isBatchIdValid && isExpectedBatchIdValid) {
            if (!pollingState.isBatchIdFallbackLogged) {
                console.error('[🤰]', 'Vector store file batch id missing from response; falling back to expected', {
                    vectorStoreId,
                    expectedBatchId,
                    returnedBatchId: batchId,
                    rawVectorStoreId,
                    logLabel,
                });
                pollingState.isBatchIdFallbackLogged = true;
            }

            batchId = expectedBatchId;
            isBatchIdValid = true;
        }

        if (!isBatchIdValid && !pollingState.isBatchIdInvalidLogged) {
            console.error('[🤰]', 'Vector store file batch id is invalid; stopping polling', {
                vectorStoreId,
                expectedBatchId,
                returnedBatchId: batchId,
                rawVectorStoreId,
                logLabel,
            });
            pollingState.isBatchIdInvalidLogged = true;
        }

        const isBatchIdMismatch = isExpectedBatchIdValid && isBatchIdValid && batchId !== expectedBatchId;

        if (isBatchIdMismatch && !pollingState.isBatchIdMismatchLogged) {
            console.error('[🤰]', 'Vector store file batch id mismatch', {
                vectorStoreId,
                expectedBatchId,
                returnedBatchId: batchId,
                logLabel,
            });
            pollingState.isBatchIdMismatchLogged = true;
        }

        return {
            batchId: isBatchIdValid ? batchId : undefined,
            isBatchIdValid,
            isBatchIdMismatch,
        };
    }

    /**
     * Tracks observed polling progress and emits throttled verbose status logs.
     */
    private trackVectorStoreFileBatchProgress(options: {
        readonly vectorStoreId: string;
        readonly batchId: string;
        readonly status: string;
        readonly fileCounts: TODO_any;
        readonly elapsedMs: number;
        readonly progressLogIntervalMs: number;
        readonly pollingState: VectorStoreFileBatchPollingState;
        readonly logLabel: string;
        readonly nowMs: number;
    }): void {
        const {
            vectorStoreId,
            batchId,
            status,
            fileCounts,
            elapsedMs,
            progressLogIntervalMs,
            pollingState,
            logLabel,
            nowMs,
        } = options;
        const progressKey = JSON.stringify(fileCounts);
        const statusCountsKey = `${status}-${progressKey}`;
        const isProgressing = progressKey !== pollingState.lastProgressKey;

        if (isProgressing) {
            pollingState.lastProgressAtMs = nowMs;
            pollingState.lastProgressKey = progressKey;
        }

        if (
            this.options.isVerbose &&
            (statusCountsKey !== pollingState.lastCountsKey ||
                nowMs - pollingState.lastLogAtMs >= progressLogIntervalMs)
        ) {
            console.info('[🤰]', 'Vector store file batch status', {
                vectorStoreId,
                batchId,
                status,
                fileCounts,
                elapsedMs,
                logLabel,
            });
            pollingState.lastCountsKey = statusCountsKey;
            pollingState.lastLogAtMs = nowMs;
        }
    }

    /**
     * Emits deeper diagnostics when vector-store ingestion appears stalled for too long.
     */
    private async maybeLogStalledVectorStoreFileBatch(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly batchId: string;
        readonly status: string;
        readonly uploadedFiles: ReadonlyArray<KnowledgeSourceUploadMetadata>;
        readonly diagnosticsIntervalMs: number;
        readonly pollingState: VectorStoreFileBatchPollingState;
        readonly logLabel: string;
        readonly nowMs: number;
    }): Promise<void> {
        const {
            client,
            vectorStoreId,
            batchId,
            status,
            uploadedFiles,
            diagnosticsIntervalMs,
            pollingState,
            logLabel,
            nowMs,
        } = options;

        if (status !== 'in_progress') {
            return;
        }

        if (nowMs - pollingState.lastProgressAtMs < VECTOR_STORE_STALL_LOG_THRESHOLD_MS) {
            return;
        }

        if (nowMs - pollingState.lastDiagnosticsAtMs < diagnosticsIntervalMs) {
            return;
        }

        pollingState.lastDiagnosticsAtMs = nowMs;
        await this.logVectorStoreFileBatchDiagnostics({
            client,
            vectorStoreId,
            batchId,
            uploadedFiles,
            logLabel,
            reason: 'stalled',
        });
    }

    /**
     * Handles terminal vector-store batch states that do not require further polling.
     */
    private async handleVectorStoreFileBatchTerminalState(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly batchId: string;
        readonly status: string;
        readonly fileCounts: TODO_any;
        readonly uploadedFiles: ReadonlyArray<KnowledgeSourceUploadMetadata>;
        readonly elapsedMs: number;
        readonly logLabel: string;
    }): Promise<boolean> {
        const { client, vectorStoreId, batchId, status, fileCounts, uploadedFiles, elapsedMs, logLabel } = options;

        if (status === 'completed') {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Vector store file batch completed', {
                    vectorStoreId,
                    batchId,
                    fileCounts,
                    elapsedMs,
                    logLabel,
                });
            }

            return true;
        }

        if (status === 'failed') {
            console.error('[🤰]', 'Vector store file batch completed with failures', {
                vectorStoreId,
                batchId,
                fileCounts,
                elapsedMs,
                logLabel,
            });
        } else if (status === 'cancelled') {
            console.error('[🤰]', 'Vector store file batch did not complete', {
                vectorStoreId,
                batchId,
                status,
                fileCounts,
                elapsedMs,
                logLabel,
            });
        } else {
            return false;
        }

        await this.logVectorStoreFileBatchDiagnostics({
            client,
            vectorStoreId,
            batchId,
            uploadedFiles,
            logLabel,
            reason: 'failed',
        });

        return true;
    }

    /**
     * Stops polling once the batch exceeds the configured timeout and handles optional cancellation.
     */
    private async handleVectorStoreFileBatchTimeout(options: {
        readonly client: OpenAI;
        readonly vectorStores: TODO_any;
        readonly vectorStoreId: string;
        readonly batchId: string;
        readonly isBatchIdMismatch: boolean;
        readonly expectedBatchId: string;
        readonly fileCounts: TODO_any;
        readonly uploadedFiles: ReadonlyArray<KnowledgeSourceUploadMetadata>;
        readonly elapsedMs: number;
        readonly uploadTimeoutMs: number;
        readonly shouldContinueOnVectorStoreStall: boolean;
        readonly logLabel: string;
        readonly nowMs: number;
        readonly pollStartedAtMs: number;
    }): Promise<boolean> {
        const {
            client,
            vectorStores,
            vectorStoreId,
            batchId,
            isBatchIdMismatch,
            expectedBatchId,
            fileCounts,
            uploadedFiles,
            elapsedMs,
            uploadTimeoutMs,
            shouldContinueOnVectorStoreStall,
            logLabel,
            nowMs,
            pollStartedAtMs,
        } = options;

        if (nowMs - pollStartedAtMs < uploadTimeoutMs) {
            return false;
        }

        console.error('[🤰]', 'Timed out waiting for vector store file batch', {
            vectorStoreId,
            batchId,
            fileCounts,
            elapsedMs,
            uploadTimeoutMs,
            logLabel,
        });

        await this.logVectorStoreFileBatchDiagnostics({
            client,
            vectorStoreId,
            batchId,
            uploadedFiles,
            logLabel,
            reason: 'timeout',
        });

        if (shouldContinueOnVectorStoreStall) {
            console.warn('[🤰]', 'Continuing despite vector store timeout as requested', {
                vectorStoreId,
                logLabel,
            });
            return true;
        }

        await this.cancelVectorStoreFileBatchAfterTimeout({
            vectorStores,
            vectorStoreId,
            batchId,
            isBatchIdMismatch,
            expectedBatchId,
            logLabel,
        });

        return true;
    }

    /**
     * Attempts to cancel a timed-out vector-store batch and logs any unusual id situation.
     */
    private async cancelVectorStoreFileBatchAfterTimeout(options: {
        readonly vectorStores: TODO_any;
        readonly vectorStoreId: string;
        readonly batchId: string;
        readonly isBatchIdMismatch: boolean;
        readonly expectedBatchId: string;
        readonly logLabel: string;
    }): Promise<void> {
        const { vectorStores, vectorStoreId, batchId, isBatchIdMismatch, expectedBatchId, logLabel } = options;
        const cancelBatchId = isBatchIdMismatch && isVectorStoreFileBatchId(batchId) ? batchId : expectedBatchId;

        if (!isVectorStoreFileBatchId(cancelBatchId)) {
            console.error('[🤰]', 'Skipping vector store file batch cancel (invalid batch id)', {
                vectorStoreId,
                batchId: cancelBatchId,
                logLabel,
            });
            return;
        }

        try {
            await vectorStores.fileBatches.cancel(cancelBatchId, {
                vector_store_id: vectorStoreId,
            });

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Cancelled vector store file batch after timeout', {
                    vectorStoreId,
                    batchId: cancelBatchId,
                    ...(isBatchIdMismatch ? { returnedBatchId: batchId } : {}),
                    logLabel,
                });
            }
        } catch (error) {
            assertsError(error);
            console.error('[🤰]', 'Failed to cancel vector store file batch after timeout', {
                vectorStoreId,
                batchId: expectedBatchId,
                ...(isBatchIdMismatch ? { returnedBatchId: batchId } : {}),
                logLabel,
                error: serializeError(error),
            });
        }
    }
}
