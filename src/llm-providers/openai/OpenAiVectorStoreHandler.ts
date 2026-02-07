import type { ClientOptions } from 'openai';
import OpenAI from 'openai';
import { TODO_any } from '../../_packages/types.index';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import type { string_title } from '../../types/typeAliases';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';

const DEFAULT_KNOWLEDGE_SOURCE_DOWNLOAD_TIMEOUT_MS = 30000;
const DEFAULT_KNOWLEDGE_SOURCE_UPLOAD_TIMEOUT_MS = 900000;
const VECTOR_STORE_PROGRESS_LOG_INTERVAL_MIN_MS = 15000;
const VECTOR_STORE_STALL_LOG_THRESHOLD_MS = 30000;

/**
 * Metadata for uploaded knowledge source files used for vector store diagnostics.
 */
type KnowledgeSourceUploadMetadata = {
    readonly fileId: string;
    readonly filename: string;
    readonly sizeBytes?: number;
};

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
        const vectorStores = this.getVectorStoresApi(client);
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

        const fileTypeSummary: Record<string, { count: number; totalBytes: number }> = {};
        for (const file of files) {
            const filename = file.name ?? '';
            const extension = filename.includes('.')
                ? filename.split('.').pop()?.toLowerCase() ?? 'unknown'
                : 'unknown';
            const sizeBytes = typeof file.size === 'number' ? file.size : 0;
            const summary = fileTypeSummary[extension] ?? { count: 0, totalBytes: 0 };
            summary.count += 1;
            summary.totalBytes += sizeBytes;
            fileTypeSummary[extension] = summary;
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Knowledge source file summary', {
                vectorStoreId,
                fileCount: files.length,
                totalBytes,
                fileTypeSummary,
                logLabel,
            });
        }

        const fileEntries = files.map((file, index) => ({ file, index }));
        const fileIterator = fileEntries.values();
        const fileIds: string[] = [];
        const uploadedFiles: KnowledgeSourceUploadMetadata[] = [];
        const failedUploads: Array<{ index: number; filename: string; error: ReturnType<typeof serializeError> }> = [];
        let uploadedCount = 0;

        const processFiles = async (iterator: IterableIterator<{ file: File; index: number }>): Promise<void> => {
            for (const { file, index } of iterator) {
                const uploadIndex = index + 1;
                const filename = file.name || `knowledge-source-${uploadIndex}`;
                const extension = filename.includes('.')
                    ? filename.split('.').pop()?.toLowerCase() ?? 'unknown'
                    : 'unknown';
                const sizeBytes = typeof file.size === 'number' ? file.size : undefined;
                const fileUploadStartedAtMs = Date.now();

                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Uploading knowledge source file', {
                        index: uploadIndex,
                        total: files.length,
                        filename,
                        extension,
                        sizeBytes,
                        logLabel,
                    });
                }

                try {
                    const uploaded = await client.files.create({ file, purpose: 'assistants' });
                    fileIds.push(uploaded.id);
                    uploadedFiles.push({ fileId: uploaded.id, filename, sizeBytes });
                    uploadedCount += 1;

                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Uploaded knowledge source file', {
                            index: uploadIndex,
                            total: files.length,
                            filename,
                            sizeBytes,
                            fileId: uploaded.id,
                            elapsedMs: Date.now() - fileUploadStartedAtMs,
                            logLabel,
                        });
                    }
                } catch (error) {
                    assertsError(error);
                    const serializedError = serializeError(error);
                    failedUploads.push({ index: uploadIndex, filename, error: serializedError });
                    console.error('[🤰]', 'Failed to upload knowledge source file', {
                        index: uploadIndex,
                        total: files.length,
                        filename,
                        sizeBytes,
                        elapsedMs: Date.now() - fileUploadStartedAtMs,
                        logLabel,
                        error: serializedError,
                    });
                }
            }
        };

        const workerCount = Math.min(maxConcurrency, files.length);
        const workers = Array.from({ length: workerCount }, () => processFiles(fileIterator));
        await Promise.all(workers);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Finished uploading knowledge source files', {
                vectorStoreId,
                fileCount: files.length,
                uploadedCount,
                failedCount: failedUploads.length,
                elapsedMs: Date.now() - uploadStartedAtMs,
                failedSamples: failedUploads.slice(0, 3),
                logLabel,
            });
        }

        if (fileIds.length === 0) {
            console.error('[🤰]', 'No knowledge source files were uploaded', {
                vectorStoreId,
                fileCount: files.length,
                failedCount: failedUploads.length,
                logLabel,
            });
            return null;
        }

        const batch = await vectorStores.fileBatches.create(vectorStoreId, {
            file_ids: fileIds,
        });
        const expectedBatchId = batch.id;
        const expectedBatchIdValid = expectedBatchId.startsWith('vsfb_');

        if (!expectedBatchIdValid) {
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

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Created vector store file batch', {
                vectorStoreId,
                batchId: expectedBatchId,
                fileCount: fileIds.length,
                logLabel,
            });
        }

        const pollStartedAtMs = Date.now();
        const progressLogIntervalMs = Math.max(VECTOR_STORE_PROGRESS_LOG_INTERVAL_MIN_MS, pollIntervalMs);
        const diagnosticsIntervalMs = Math.max(60000, pollIntervalMs * 5);
        // let lastStatus: string | undefined;
        let lastCountsKey = '';
        let lastProgressKey = '';
        let lastLogAtMs = 0;
        let lastProgressAtMs = pollStartedAtMs;
        let lastDiagnosticsAtMs = pollStartedAtMs;
        let latestBatch = batch;
        let loggedBatchIdMismatch = false;
        let loggedBatchIdFallback = false;
        let loggedBatchIdInvalid = false;
        let shouldPoll = true;

        while (shouldPoll) {
            const nowMs = Date.now();

            // [🤰] Note: Sometimes OpenAI returns Vector Store object instead of Batch object, or IDs get swapped.
            const rawBatchId = typeof latestBatch.id === 'string' ? latestBatch.id : '';
            const rawVectorStoreId = (latestBatch as TODO_any).vector_store_id;
            let returnedBatchId = rawBatchId;
            let returnedBatchIdValid = typeof returnedBatchId === 'string' && returnedBatchId.startsWith('vsfb_');

            if (!returnedBatchIdValid && expectedBatchIdValid) {
                if (!loggedBatchIdFallback) {
                    console.error('[🤰]', 'Vector store file batch id missing from response; falling back to expected', {
                        vectorStoreId,
                        expectedBatchId,
                        returnedBatchId,
                        rawVectorStoreId,
                        logLabel,
                    });
                    loggedBatchIdFallback = true;
                }
                returnedBatchId = expectedBatchId;
                returnedBatchIdValid = true;
            }

            if (!returnedBatchIdValid && !loggedBatchIdInvalid) {
                console.error('[🤰]', 'Vector store file batch id is invalid; stopping polling', {
                    vectorStoreId,
                    expectedBatchId,
                    returnedBatchId,
                    rawVectorStoreId,
                    logLabel,
                });
                loggedBatchIdInvalid = true;
            }

            const batchIdMismatch = expectedBatchIdValid && returnedBatchIdValid && returnedBatchId !== expectedBatchId;

            if (batchIdMismatch && !loggedBatchIdMismatch) {
                console.error('[🤰]', 'Vector store file batch id mismatch', {
                    vectorStoreId,
                    expectedBatchId,
                    returnedBatchId,
                    logLabel,
                });
                loggedBatchIdMismatch = true;
            }

            if (returnedBatchIdValid) {
                latestBatch = await vectorStores.fileBatches.retrieve(returnedBatchId, {
                    vector_store_id: vectorStoreId,
                });
            } else {
                shouldPoll = false;
                continue;
            }

            const status = latestBatch.status ?? 'unknown';
            const fileCounts = latestBatch.file_counts ?? {};
            const progressKey = JSON.stringify(fileCounts);
            const statusCountsKey = `${status}-${progressKey}`;
            const isProgressing = progressKey !== lastProgressKey;

            if (isProgressing) {
                lastProgressAtMs = nowMs;
                lastProgressKey = progressKey;
            }

            if (
                this.options.isVerbose &&
                (statusCountsKey !== lastCountsKey || nowMs - lastLogAtMs >= progressLogIntervalMs)
            ) {
                console.info('[🤰]', 'Vector store file batch status', {
                    vectorStoreId,
                    batchId: returnedBatchId,
                    status,
                    fileCounts,
                    elapsedMs: nowMs - pollStartedAtMs,
                    logLabel,
                });
                lastCountsKey = statusCountsKey;
                lastLogAtMs = nowMs;
            }

            if (
                status === 'in_progress' &&
                nowMs - lastProgressAtMs >= VECTOR_STORE_STALL_LOG_THRESHOLD_MS &&
                nowMs - lastDiagnosticsAtMs >= diagnosticsIntervalMs
            ) {
                lastDiagnosticsAtMs = nowMs;
                await this.logVectorStoreFileBatchDiagnostics({
                    client,
                    vectorStoreId,
                    batchId: returnedBatchId,
                    uploadedFiles,
                    logLabel,
                    reason: 'stalled',
                });
            }

            if (status === 'completed') {
                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Vector store file batch completed', {
                        vectorStoreId,
                        batchId: returnedBatchId,
                        fileCounts,
                        elapsedMs: nowMs - pollStartedAtMs,
                        logLabel,
                    });
                }
                shouldPoll = false;
                continue;
            }

            if (status === 'failed') {
                console.error('[🤰]', 'Vector store file batch completed with failures', {
                    vectorStoreId,
                    batchId: returnedBatchId,
                    fileCounts,
                    elapsedMs: nowMs - pollStartedAtMs,
                    logLabel,
                });
                await this.logVectorStoreFileBatchDiagnostics({
                    client,
                    vectorStoreId,
                    batchId: returnedBatchId,
                    uploadedFiles,
                    logLabel,
                    reason: 'failed',
                });
                shouldPoll = false;
                continue;
            }

            if (status === 'cancelled') {
                console.error('[🤰]', 'Vector store file batch did not complete', {
                    vectorStoreId,
                    batchId: returnedBatchId,
                    status,
                    fileCounts,
                    elapsedMs: nowMs - pollStartedAtMs,
                    logLabel,
                });
                await this.logVectorStoreFileBatchDiagnostics({
                    client,
                    vectorStoreId,
                    batchId: returnedBatchId,
                    uploadedFiles,
                    logLabel,
                    reason: 'failed',
                });
                shouldPoll = false;
                continue;
            }

            if (nowMs - pollStartedAtMs >= uploadTimeoutMs) {
                console.error('[🤰]', 'Timed out waiting for vector store file batch', {
                    vectorStoreId,
                    batchId: returnedBatchId,
                    fileCounts,
                    elapsedMs: nowMs - pollStartedAtMs,
                    uploadTimeoutMs,
                    logLabel,
                });

                await this.logVectorStoreFileBatchDiagnostics({
                    client,
                    vectorStoreId,
                    batchId: returnedBatchId,
                    uploadedFiles,
                    logLabel,
                    reason: 'timeout',
                });

                if (this.shouldContinueOnVectorStoreStall()) {
                    console.warn('[🤰]', 'Continuing despite vector store timeout as requested', {
                        vectorStoreId,
                        logLabel,
                    });
                    shouldPoll = false;
                    continue;
                }

                try {
                    const cancelBatchId =
                        batchIdMismatch && returnedBatchId.startsWith('vsfb_') ? returnedBatchId : expectedBatchId;
                    if (!cancelBatchId.startsWith('vsfb_')) {
                        console.error('[🤰]', 'Skipping vector store file batch cancel (invalid batch id)', {
                            vectorStoreId,
                            batchId: cancelBatchId,
                            logLabel,
                        });
                    } else {
                        await vectorStores.fileBatches.cancel(cancelBatchId, {
                            vector_store_id: vectorStoreId,
                        });
                    }
                    if (this.options.isVerbose) {
                        console.info('[🤰]', 'Cancelled vector store file batch after timeout', {
                            vectorStoreId,
                            batchId:
                                batchIdMismatch && returnedBatchId.startsWith('vsfb_')
                                    ? returnedBatchId
                                    : expectedBatchId,
                            ...(batchIdMismatch ? { returnedBatchId } : {}),
                            logLabel,
                        });
                    }
                } catch (error) {
                    assertsError(error);
                    console.error('[🤰]', 'Failed to cancel vector store file batch after timeout', {
                        vectorStoreId,
                        batchId: expectedBatchId,
                        ...(batchIdMismatch ? { returnedBatchId } : {}),
                        logLabel,
                        error: serializeError(error),
                    });
                }

                shouldPoll = false;
                continue;
            }

            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        return latestBatch;
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
                const sourceType = source.startsWith('http') || source.startsWith('https') ? 'url' : 'file';

                if (this.options.isVerbose) {
                    console.info('[🤰]', 'Processing knowledge source', {
                        index: index + 1,
                        total: knowledgeSourcesCount,
                        source,
                        sourceType,
                        logLabel,
                    });
                }

                // Check if it's a URL
                if (source.startsWith('http://') || source.startsWith('https://')) {
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
