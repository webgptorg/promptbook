import type { ClientOptions } from 'openai';
import OpenAI from 'openai';
import { TODO_any } from '../../_packages/types.index';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import type { string_title } from '../../types/typeAliases';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import { isDataUrlKnowledgeSource, parseDataUrlKnowledgeSource } from '../../utils/knowledge/inlineKnowledgeSource';

/**
 * Constant for default knowledge source download timeout ms.
 */
const DEFAULT_KNOWLEDGE_SOURCE_DOWNLOAD_TIMEOUT_MS = 30000;
/**
 * Constant for default knowledge source upload timeout ms.
 */
const DEFAULT_KNOWLEDGE_SOURCE_UPLOAD_TIMEOUT_MS = 900000;
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
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type KnowledgeSourceUploadMetadata = {
    readonly fileId: string;
    readonly filename: string;
    readonly sizeBytes?: number;
};

/**
 * Aggregated upload totals grouped by normalized file extension.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type KnowledgeSourceFileTypeSummary = Record<string, { count: number; totalBytes: number }>;

/**
 * One failed knowledge-source upload attempt.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type KnowledgeSourceUploadFailure = {
    readonly index: number;
    readonly filename: string;
    readonly error: ReturnType<typeof serializeError>;
};

/**
 * Accumulated result of uploading prepared knowledge-source files.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type KnowledgeSourceFilesUploadResult = {
    readonly fileIds: string[];
    readonly uploadedFiles: KnowledgeSourceUploadMetadata[];
    readonly failedUploads: KnowledgeSourceUploadFailure[];
};

/**
 * Result of creating the vector store file batch that tracks uploaded knowledge sources.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type CreatedVectorStoreFileBatch = {
    readonly batch: TODO_any;
    readonly expectedBatchId: string;
    readonly isExpectedBatchIdValid: boolean;
};

/**
 * Resolved batch identifier used while polling vector store ingestion.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type VectorStoreFileBatchIdResolution = {
    readonly batchId?: string;
    readonly isBatchIdValid: boolean;
    readonly isBatchIdMismatch: boolean;
};

/**
 * Mutable polling state used to throttle progress and diagnostics logging.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
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
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
type RetrievedVectorStoreFileBatch = {
    readonly batch: TODO_any;
    readonly batchId: string;
    readonly isBatchIdMismatch: boolean;
};

/**
 * Resolves the filename bucket used in upload summaries and diagnostics.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
function resolveKnowledgeSourceFileExtension(filename: string): string {
    return filename.includes('.') ? filename.split('.').pop()?.toLowerCase() ?? 'unknown' : 'unknown';
}

/**
 * Returns the fallback filename used when a knowledge-source `File` has no name.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
function resolveKnowledgeSourceUploadFilename(file: File, uploadIndex: number): string {
    return file.name || `knowledge-source-${uploadIndex}`;
}

/**
 * Creates an extension summary for the prepared knowledge-source files.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
function createKnowledgeSourceFileTypeSummary(files: ReadonlyArray<File>): KnowledgeSourceFileTypeSummary {
    const fileTypeSummary: KnowledgeSourceFileTypeSummary = {};

    for (const file of files) {
        const extension = resolveKnowledgeSourceFileExtension(file.name ?? '');
        const sizeBytes = typeof file.size === 'number' ? file.size : 0;
        const summary = fileTypeSummary[extension] ?? { count: 0, totalBytes: 0 };
        summary.count += 1;
        summary.totalBytes += sizeBytes;
        fileTypeSummary[extension] = summary;
    }

    return fileTypeSummary;
}

/**
 * Returns true when the provided identifier looks like an OpenAI vector-store file-batch id.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
 */
function isVectorStoreFileBatchId(batchId: string | undefined): batchId is string {
    return typeof batchId === 'string' && batchId.startsWith('vsfb_');
}

/**
 * Creates the mutable log-throttling state used while polling vector store ingestion.
 *
 * @private internal utility of `OpenAiVectorStoreHandler`
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
 * Shared options for OpenAI vector store handling.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiVectorStoreHandlerOptions = OpenAiCompatibleExecutionToolsOptions &
    ClientOptions & {
        /**
         * Per-knowledge-source download timeout in milliseconds when preparing vector stores.
         *
         * @default 30000
         */
        readonly knowledgeSourceDownloadTimeoutMs?: number;

        /**
         * Max concurrency for uploading knowledge source files to the vector store.
         *
         * @default 5
         */
        readonly knowledgeSourceUploadMaxConcurrency?: number;

        /**
         * Poll interval in milliseconds when waiting for vector store file batch processing.
         *
         * @default 5000
         */
        readonly knowledgeSourceUploadPollIntervalMs?: number;

        /**
         * Overall timeout in milliseconds for vector store file batch processing.
         *
         * @default 900000
         */
        readonly knowledgeSourceUploadTimeoutMs?: number;

        /**
         * Whether we should continue even if vector store ingestion stalls.
         *
         * @default true
         */
        readonly shouldContinueOnVectorStoreStall?: boolean;
    };

/**
 * Base class for OpenAI execution tools that need hosted vector stores.
 *
 * @public exported from `@promptbook/openai`
 */
export abstract class OpenAiVectorStoreHandler extends OpenAiExecutionTools {
    /**
     * Returns the per-knowledge-source download timeout in milliseconds.
     */
    protected getKnowledgeSourceDownloadTimeoutMs(): number {
        return this.vectorStoreOptions.knowledgeSourceDownloadTimeoutMs ?? DEFAULT_KNOWLEDGE_SOURCE_DOWNLOAD_TIMEOUT_MS;
    }

    /**
     * Returns the max concurrency for knowledge source uploads.
     */
    protected getKnowledgeSourceUploadMaxConcurrency(): number {
        return this.vectorStoreOptions.knowledgeSourceUploadMaxConcurrency ?? 5;
    }

    /**
     * Returns the polling interval in milliseconds for vector store uploads.
     */
    protected getKnowledgeSourceUploadPollIntervalMs(): number {
        return this.vectorStoreOptions.knowledgeSourceUploadPollIntervalMs ?? 5000;
    }

    /**
     * Returns the overall upload timeout in milliseconds for vector store uploads.
     */
    protected getKnowledgeSourceUploadTimeoutMs(): number {
        return this.vectorStoreOptions.knowledgeSourceUploadTimeoutMs ?? DEFAULT_KNOWLEDGE_SOURCE_UPLOAD_TIMEOUT_MS;
    }

    /**
     * Returns true if we should continue even if vector store ingestion stalls.
     */
    protected shouldContinueOnVectorStoreStall(): boolean {
        return this.vectorStoreOptions.shouldContinueOnVectorStoreStall ?? true;
    }

    /**
     * Returns vector-store-specific options with extended settings.
     */
    protected get vectorStoreOptions(): OpenAiVectorStoreHandlerOptions {
        return this.options as OpenAiVectorStoreHandlerOptions;
    }

    /**
     * Returns the OpenAI vector stores API surface, supporting stable and beta SDKs.
     */
    protected getVectorStoresApi(client: OpenAI): TODO_any {
        const vectorStores = (client as TODO_any).vectorStores ?? (client.beta as TODO_any)?.vectorStores;

        if (!vectorStores) {
            throw new Error(
                'OpenAI client does not support vector stores. Please ensure you are using a compatible version of the OpenAI SDK with vector store support.',
            );
        }

        return vectorStores;
    }

    /**
     * Downloads a knowledge source URL into a File for vector store upload.
     */
    protected async downloadKnowledgeSourceFile(options: {
        readonly source: string;
        readonly timeoutMs: number;
        readonly logLabel: string;
    }): Promise<{
        readonly file: File;
        readonly sizeBytes: number;
        readonly filename: string;
        readonly elapsedMs: number;
    } | null> {
        const { source, timeoutMs, logLabel } = options;
        const startedAtMs = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Downloading knowledge source', {
                source,
                timeoutMs,
                logLabel,
            });
        }

        try {
            const response = await fetch(source, { signal: controller.signal });
            const contentType = response.headers.get('content-type') ?? undefined;

            if (!response.ok) {
                console.error('[🤰]', 'Failed to download knowledge source', {
                    source,
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                    elapsedMs: Date.now() - startedAtMs,
                    logLabel,
                });
                return null;
            }

            const buffer = await response.arrayBuffer();
            let filename = source.split('/').pop() || 'downloaded-file';
            try {
                const url = new URL(source);
                filename = url.pathname.split('/').pop() || filename;
            } catch (error) {
                // Keep default filename
            }

            const file = new File([buffer], filename, contentType ? { type: contentType } : undefined);
            const elapsedMs = Date.now() - startedAtMs;
            const sizeBytes = buffer.byteLength;

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Downloaded knowledge source', {
                    source,
                    filename,
                    sizeBytes,
                    contentType,
                    elapsedMs,
                    logLabel,
                });
            }

            return { file, sizeBytes, filename, elapsedMs };
        } catch (error) {
            assertsError(error);
            console.error('[🤰]', 'Error downloading knowledge source', {
                source,
                elapsedMs: Date.now() - startedAtMs,
                logLabel,
                error: serializeError(error),
            });
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Logs vector store file batch diagnostics to help trace ingestion stalls or failures.
     */
    protected async logVectorStoreFileBatchDiagnostics(options: {
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
            const vectorStores = this.getVectorStoresApi(client);
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
     * Uploads knowledge source files to the vector store and polls until processing completes.
     */
    protected async uploadKnowledgeSourceFilesToVectorStore(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly files: ReadonlyArray<File>;
        readonly totalBytes: number;
        readonly logLabel: string;
    }): Promise<TODO_any | null> {
        const { client, vectorStoreId, files, totalBytes, logLabel } = options;
        const uploadStartedAtMs = Date.now();
        const maxConcurrency = Math.max(1, this.getKnowledgeSourceUploadMaxConcurrency());
        const pollIntervalMs = Math.max(1000, this.getKnowledgeSourceUploadPollIntervalMs());
        const uploadTimeoutMs = Math.max(1000, this.getKnowledgeSourceUploadTimeoutMs());

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Uploading knowledge source files to OpenAI', {
                vectorStoreId,
                fileCount: files.length,
                totalBytes,
                maxConcurrency,
                pollIntervalMs,
                uploadTimeoutMs,
                logLabel,
            });
        }

        const fileTypeSummary = createKnowledgeSourceFileTypeSummary(files);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Knowledge source file summary', {
                vectorStoreId,
                fileCount: files.length,
                totalBytes,
                fileTypeSummary,
                logLabel,
            });
        }

        const uploadResult = await this.uploadPreparedKnowledgeSourceFiles({
            client,
            vectorStoreId,
            files,
            maxConcurrency,
            uploadStartedAtMs,
            logLabel,
        });

        if (uploadResult.fileIds.length === 0) {
            console.error('[🤰]', 'No knowledge source files were uploaded', {
                vectorStoreId,
                fileCount: files.length,
                failedCount: uploadResult.failedUploads.length,
                logLabel,
            });
            return null;
        }

        const createdBatch = await this.createVectorStoreFileBatch({
            client,
            vectorStoreId,
            fileIds: uploadResult.fileIds,
            logLabel,
        });

        return this.pollVectorStoreFileBatchUntilSettled({
            client,
            vectorStoreId,
            batch: createdBatch.batch,
            expectedBatchId: createdBatch.expectedBatchId,
            isExpectedBatchIdValid: createdBatch.isExpectedBatchIdValid,
            uploadedFiles: uploadResult.uploadedFiles,
            pollIntervalMs,
            uploadTimeoutMs,
            logLabel,
        });
    }

    /**
     * Uploads the prepared knowledge-source files with bounded concurrency.
     */
    private async uploadPreparedKnowledgeSourceFiles(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly files: ReadonlyArray<File>;
        readonly maxConcurrency: number;
        readonly uploadStartedAtMs: number;
        readonly logLabel: string;
    }): Promise<KnowledgeSourceFilesUploadResult> {
        const { client, vectorStoreId, files, maxConcurrency, uploadStartedAtMs, logLabel } = options;
        const uploadResult: KnowledgeSourceFilesUploadResult = {
            fileIds: [],
            uploadedFiles: [],
            failedUploads: [],
        };
        const fileEntries = files.map((file, index) => ({ file, index }));
        const fileIterator = fileEntries.values();
        const workerCount = Math.min(maxConcurrency, files.length);
        const workers = Array.from({ length: workerCount }, () =>
            this.uploadPreparedKnowledgeSourceFilesWorker({
                client,
                files,
                fileIterator,
                uploadResult,
                logLabel,
            }),
        );

        await Promise.all(workers);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Finished uploading knowledge source files', {
                vectorStoreId,
                fileCount: files.length,
                uploadedCount: uploadResult.fileIds.length,
                failedCount: uploadResult.failedUploads.length,
                elapsedMs: Date.now() - uploadStartedAtMs,
                failedSamples: uploadResult.failedUploads.slice(0, 3),
                logLabel,
            });
        }

        return uploadResult;
    }

    /**
     * Reuses the shared iterator to upload one slice of knowledge-source files.
     */
    private async uploadPreparedKnowledgeSourceFilesWorker(options: {
        readonly client: OpenAI;
        readonly files: ReadonlyArray<File>;
        readonly fileIterator: IterableIterator<{ file: File; index: number }>;
        readonly uploadResult: KnowledgeSourceFilesUploadResult;
        readonly logLabel: string;
    }): Promise<void> {
        const { client, files, fileIterator, uploadResult, logLabel } = options;

        for (const { file, index } of fileIterator) {
            const fileUploadResult = await this.uploadPreparedKnowledgeSourceFile({
                client,
                file,
                index,
                totalFiles: files.length,
                logLabel,
            });

            if ('fileId' in fileUploadResult) {
                uploadResult.fileIds.push(fileUploadResult.fileId);
                uploadResult.uploadedFiles.push(fileUploadResult.metadata);
            } else {
                uploadResult.failedUploads.push(fileUploadResult.failedUpload);
            }
        }
    }

    /**
     * Uploads one prepared knowledge-source file to OpenAI and records detailed diagnostics.
     */
    private async uploadPreparedKnowledgeSourceFile(options: {
        readonly client: OpenAI;
        readonly file: File;
        readonly index: number;
        readonly totalFiles: number;
        readonly logLabel: string;
    }): Promise<
        | { readonly fileId: string; readonly metadata: KnowledgeSourceUploadMetadata }
        | { readonly failedUpload: KnowledgeSourceUploadFailure }
    > {
        const { client, file, index, totalFiles, logLabel } = options;
        const uploadIndex = index + 1;
        const filename = resolveKnowledgeSourceUploadFilename(file, uploadIndex);
        const extension = resolveKnowledgeSourceFileExtension(filename);
        const sizeBytes = typeof file.size === 'number' ? file.size : undefined;
        const fileUploadStartedAtMs = Date.now();

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Uploading knowledge source file', {
                index: uploadIndex,
                total: totalFiles,
                filename,
                extension,
                sizeBytes,
                logLabel,
            });
        }

        try {
            const uploaded = await client.files.create({ file, purpose: 'assistants' });

            if (this.options.isVerbose) {
                console.info('[🤰]', 'Uploaded knowledge source file', {
                    index: uploadIndex,
                    total: totalFiles,
                    filename,
                    sizeBytes,
                    fileId: uploaded.id,
                    elapsedMs: Date.now() - fileUploadStartedAtMs,
                    logLabel,
                });
            }

            return {
                fileId: uploaded.id,
                metadata: {
                    fileId: uploaded.id,
                    filename,
                    sizeBytes,
                },
            };
        } catch (error) {
            assertsError(error);
            const serializedError = serializeError(error);
            const failedUpload: KnowledgeSourceUploadFailure = {
                index: uploadIndex,
                filename,
                error: serializedError,
            };

            console.error('[🤰]', 'Failed to upload knowledge source file', {
                index: uploadIndex,
                total: totalFiles,
                filename,
                sizeBytes,
                elapsedMs: Date.now() - fileUploadStartedAtMs,
                logLabel,
                error: serializedError,
            });

            return { failedUpload };
        }
    }

    /**
     * Creates the OpenAI vector-store file batch for the uploaded knowledge-source files.
     */
    private async createVectorStoreFileBatch(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly fileIds: ReadonlyArray<string>;
        readonly logLabel: string;
    }): Promise<CreatedVectorStoreFileBatch> {
        const { client, vectorStoreId, fileIds, logLabel } = options;
        const vectorStores = this.getVectorStoresApi(client);
        const batch = await vectorStores.fileBatches.create(vectorStoreId, {
            file_ids: [...fileIds],
        });
        const expectedBatchId = batch.id;
        const isExpectedBatchIdValid = this.logCreatedVectorStoreFileBatchIssues({
            batch,
            vectorStoreId,
            expectedBatchId,
            logLabel,
        });

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Created vector store file batch', {
                vectorStoreId,
                batchId: expectedBatchId,
                fileCount: fileIds.length,
                logLabel,
            });
        }

        return {
            batch,
            expectedBatchId,
            isExpectedBatchIdValid,
        };
    }

    /**
     * Logs warnings for unexpected vector-store batch metadata right after creation.
     */
    private logCreatedVectorStoreFileBatchIssues(options: {
        readonly batch: TODO_any;
        readonly vectorStoreId: string;
        readonly expectedBatchId: string;
        readonly logLabel: string;
    }): boolean {
        const { batch, vectorStoreId, expectedBatchId, logLabel } = options;
        const isExpectedBatchIdValid = isVectorStoreFileBatchId(expectedBatchId);

        if (!isExpectedBatchIdValid) {
            console.error('[🤰]', 'Vector store file batch id looks invalid', {
                vectorStoreId,
                batchId: expectedBatchId,
                batchVectorStoreId: batch.vector_store_id,
                logLabel,
            });
        } else if (batch.vector_store_id !== vectorStoreId) {
            console.error('[🤰]', 'Vector store file batch vector store id mismatch', {
                vectorStoreId,
                batchId: expectedBatchId,
                batchVectorStoreId: batch.vector_store_id,
                logLabel,
            });
        }

        return isExpectedBatchIdValid;
    }

    /**
     * Polls the created vector-store batch until ingestion completes, fails, or times out.
     */
    private async pollVectorStoreFileBatchUntilSettled(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly batch: TODO_any;
        readonly expectedBatchId: string;
        readonly isExpectedBatchIdValid: boolean;
        readonly uploadedFiles: ReadonlyArray<KnowledgeSourceUploadMetadata>;
        readonly pollIntervalMs: number;
        readonly uploadTimeoutMs: number;
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
            logLabel,
        } = options;
        const vectorStores = this.getVectorStoresApi(client);
        const pollStartedAtMs = Date.now();
        const progressLogIntervalMs = Math.max(VECTOR_STORE_PROGRESS_LOG_INTERVAL_MIN_MS, pollIntervalMs);
        const diagnosticsIntervalMs = Math.max(60000, pollIntervalMs * 5);
        const pollingState = createVectorStoreFileBatchPollingState(pollStartedAtMs);
        let latestBatch = batch;
        let isPolling = true;

        while (isPolling) {
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
                isPolling = false;
                continue;
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
                isPolling = false;
                continue;
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
                    logLabel,
                    nowMs,
                    pollStartedAtMs,
                })
            ) {
                isPolling = false;
                continue;
            }

            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        return latestBatch;
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

        // [🤰] Note: Sometimes OpenAI returns Vector Store object instead of Batch object, or IDs get swapped.
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
            (statusCountsKey !== pollingState.lastCountsKey || nowMs - pollingState.lastLogAtMs >= progressLogIntervalMs)
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

        if (this.shouldContinueOnVectorStoreStall()) {
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

    /**
     * Creates a vector store and uploads knowledge sources, returning its ID.
     */
    protected async createVectorStoreWithKnowledgeSources(options: {
        readonly client: OpenAI;
        readonly name: string_title;
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly logLabel: string;
    }): Promise<{
        readonly vectorStoreId: string;
        readonly uploadedFileCount: number;
        readonly skippedCount: number;
        readonly totalBytes: number;
    }> {
        const { client, name, knowledgeSources, logLabel } = options;
        const vectorStores = this.getVectorStoresApi(client);
        const knowledgeSourcesCount = knowledgeSources.length;
        const downloadTimeoutMs = this.getKnowledgeSourceDownloadTimeoutMs();

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Creating vector store with knowledge sources', {
                name,
                knowledgeSourcesCount,
                downloadTimeoutMs,
                logLabel,
            });
        }

        const vectorStore = await vectorStores.create({
            name: `${name} Knowledge Base`,
        });
        const vectorStoreId = vectorStore.id;

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Vector store created', {
                vectorStoreId,
                logLabel,
            });
        }

        const fileStreams: File[] = [];
        const skippedSources: Array<{ source: string; reason: string }> = [];
        let totalBytes = 0;
        const processingStartedAtMs = Date.now();

        for (const [index, source] of knowledgeSources.entries()) {
            try {
                const isDataUrl = isDataUrlKnowledgeSource(source);
                const isHttp = source.startsWith('http://') || source.startsWith('https://');
                const sourceType = isDataUrl ? 'data_url' : isHttp ? 'url' : 'file';

                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Processing knowledge source', {
                        index: index + 1,
                        total: knowledgeSourcesCount,
                        source,
                        sourceType,
                        logLabel,
                    });
                }

                if (isDataUrl) {
                    const parsed = parseDataUrlKnowledgeSource(source);

                    if (!parsed) {
                        skippedSources.push({ source, reason: 'invalid_data_url' });

                        if (this.options.isVerbose) {
                            console.info('[🤰]', 'Skipping knowledge source (invalid data URL)', {
                                source,
                                sourceType,
                                logLabel,
                            });
                        }

                        continue;
                    }

                    const dataUrlFile = new File([parsed.buffer], parsed.filename, {
                        type: parsed.mimeType,
                    });
                    fileStreams.push(dataUrlFile);
                    totalBytes += parsed.buffer.length;

                    continue;
                }

                if (isHttp) {
                    const downloadResult = await this.downloadKnowledgeSourceFile({
                        source,
                        timeoutMs: downloadTimeoutMs,
                        logLabel,
                    });

                    if (downloadResult) {
                        fileStreams.push(downloadResult.file);
                        totalBytes += downloadResult.sizeBytes;
                    } else {
                        skippedSources.push({ source, reason: 'download_failed' });
                    }
                } else {
                    skippedSources.push({ source, reason: 'unsupported_source_type' });

                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Skipping knowledge source (unsupported type)', {
                            source,
                            sourceType,
                            logLabel,
                        });
                    }
                    /*
                    TODO: [🤰] Resolve problem with browser environment
                    // Assume it's a local file path
                    // Note: This will work in Node.js environment
                    // For browser environments, this would need different handling
                    const fs = await import('fs');
                    const fileStream = fs.createReadStream(source);
                    fileStreams.push(fileStream);
                    */
                }
            } catch (error) {
                assertsError(error);
                skippedSources.push({ source, reason: 'processing_error' });
                console.error('[🤰]', 'Error processing knowledge source', {
                    source,
                    logLabel,
                    error: serializeError(error),
                });
            }
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Finished processing knowledge sources', {
                total: knowledgeSourcesCount,
                downloadedCount: fileStreams.length,
                skippedCount: skippedSources.length,
                totalBytes,
                elapsedMs: Date.now() - processingStartedAtMs,
                skippedSamples: skippedSources.slice(0, 3),
                logLabel,
            });
        }

        if (fileStreams.length > 0) {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Uploading files to vector store', {
                    vectorStoreId,
                    fileCount: fileStreams.length,
                    totalBytes,
                    maxConcurrency: this.getKnowledgeSourceUploadMaxConcurrency(),
                    pollIntervalMs: this.getKnowledgeSourceUploadPollIntervalMs(),
                    uploadTimeoutMs: this.getKnowledgeSourceUploadTimeoutMs(),
                    logLabel,
                });
            }

            try {
                await this.uploadKnowledgeSourceFilesToVectorStore({
                    client,
                    vectorStoreId,
                    files: fileStreams,
                    totalBytes,
                    logLabel,
                });
            } catch (error) {
                assertsError(error);
                console.error('[🤰]', 'Error uploading files to vector store', {
                    vectorStoreId,
                    logLabel,
                    error: serializeError(error),
                });
            }
        } else if (this.options.isVerbose) {
            console.info('[🤰]', 'No knowledge source files to upload', {
                vectorStoreId,
                skippedCount: skippedSources.length,
                logLabel,
            });
        }

        return {
            vectorStoreId,
            uploadedFileCount: fileStreams.length,
            skippedCount: skippedSources.length,
            totalBytes,
        };
    }
}
