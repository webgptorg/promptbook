import OpenAI from 'openai';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import type { string_title } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import type { OpenAiVectorStoreOptions } from './OpenAiVectorStoreOptions';
import { uploadFilesToOpenAi } from './utils/uploadFilesToOpenAi';

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
 * Base OpenAI execution tools with shared vector store handling.
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiVectorStoreExecutionTools extends OpenAiExecutionTools {
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
     * Returns vector store-specific options with extended settings.
     */
    protected get vectorStoreOptions(): OpenAiVectorStoreOptions {
        return this.options as OpenAiVectorStoreOptions;
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
            console.info('[??]', 'Downloading knowledge source', {
                source,
                timeoutMs,
                logLabel,
            });
        }

        try {
            const response = await fetch(source, { signal: controller.signal });
            const contentType = response.headers.get('content-type') ?? undefined;

            if (!response.ok) {
                console.error('[??]', 'Failed to download knowledge source', {
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

            const file = new File([buffer], filename, {
                type: contentType ?? 'application/octet-stream',
            });

            return {
                file,
                sizeBytes: buffer.byteLength,
                filename,
                elapsedMs: Date.now() - startedAtMs,
            };
        } catch (error) {
            assertsError(error);

            console.error('[??]', 'Error downloading knowledge source', {
                source,
                logLabel,
                error: serializeError(error),
                elapsedMs: Date.now() - startedAtMs,
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
        readonly reason: string;
    }): Promise<void> {
        const { client, vectorStoreId, batchId, uploadedFiles, logLabel, reason } = options;

        if (!batchId || !batchId.startsWith('vsb_')) {
            console.error('[??]', 'Vector store file batch diagnostics skipped (invalid batch id)', {
                vectorStoreId,
                batchId,
                logLabel,
                reason,
            });
            return;
        }

        try {
            const batchFilesPage = await client.beta.vectorStores.fileBatches.listFiles(vectorStoreId, batchId, {
                limit: 50,
            });

            const vectorStore = await client.beta.vectorStores.retrieve(vectorStoreId);

            const logPayload = {
                vectorStoreId,
                batchId,
                reason,
                logLabel,
                batchStatus: batchFilesPage.data[0]?.status ?? 'unknown',
                batchFileCount: batchFilesPage.data.length,
                batchFiles: batchFilesPage.data.slice(0, 5),
                vectorStoreStatus: vectorStore.status,
                vectorStoreFileCounts: vectorStore.file_counts,
                vectorStoreUsageBytes: vectorStore.usage_bytes,
                uploadedFiles: uploadedFiles.slice(0, 5),
            };

            const logFunction = reason === 'error' || reason === 'timeout' ? console.error : console.info;
            logFunction('[??]', 'Vector store file batch diagnostics', logPayload);
        } catch (error) {
            assertsError(error);
            console.error('[??]', 'Vector store file batch diagnostics failed', {
                vectorStoreId,
                batchId,
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
        readonly files: Array<File>;
        readonly totalBytes: number;
        readonly logLabel: string;
    }): Promise<OpenAI.Beta.VectorStores.FileBatches.VectorStoreFileBatch | null> {
        const { client, vectorStoreId, files, totalBytes, logLabel } = options;
        const fileCount = files.length;
        const pollIntervalMs = this.getKnowledgeSourceUploadPollIntervalMs();
        const uploadTimeoutMs = this.getKnowledgeSourceUploadTimeoutMs();
        const maxConcurrency = this.getKnowledgeSourceUploadMaxConcurrency();
        const uploadedFiles: KnowledgeSourceUploadMetadata[] = [];
        const uploadStartedAtMs = Date.now();

        if (this.options.isVerbose) {
            console.info('[??]', 'Uploading knowledge sources to vector store', {
                vectorStoreId,
                fileCount,
                totalBytes,
                maxConcurrency,
                pollIntervalMs,
                uploadTimeoutMs,
                logLabel,
            });
        }

        let completedFiles = 0;

        try {
            const fileIdPromises = files.map(async (file) => {
                const uploadedFile = await uploadFilesToOpenAi(client, [file]);
                const fileId = uploadedFile[0];

                if (fileId) {
                    uploadedFiles.push({
                        fileId,
                        filename: file.name,
                        sizeBytes: file.size,
                    });
                }

                completedFiles += 1;
                if (this.options.isVerbose) {
                    console.info('[??]', 'Uploaded knowledge source file', {
                        vectorStoreId,
                        fileId,
                        filename: file.name,
                        completedFiles,
                        totalFiles: fileCount,
                        logLabel,
                    });
                }

                return fileId;
            });

            const fileIds: string[] = [];

            for (let index = 0; index < fileIdPromises.length; index += maxConcurrency) {
                const batch = fileIdPromises.slice(index, index + maxConcurrency);
                const batchResults = await Promise.all(batch);
                fileIds.push(...batchResults.filter((id): id is string => Boolean(id)));
            }

            if (fileIds.length === 0) {
                console.warn('[??]', 'No knowledge source files were uploaded', {
                    vectorStoreId,
                    logLabel,
                });
                return null;
            }

            const batch = await client.beta.vectorStores.fileBatches.create(vectorStoreId, {
                file_ids: fileIds,
            });

            if (!batch.id) {
                console.error('[??]', 'Vector store file batch id looks invalid', {
                    vectorStoreId,
                    batchId: batch.id,
                    batchVectorStoreId: batch.vector_store_id,
                    logLabel,
                });
            } else if (batch.vector_store_id !== vectorStoreId) {
                console.error('[??]', 'Vector store file batch vector store id mismatch', {
                    vectorStoreId,
                    batchId: batch.id,
                    batchVectorStoreId: batch.vector_store_id,
                    logLabel,
                });
            } else if (this.options.isVerbose) {
                console.info('[??]', 'Created vector store file batch', {
                    vectorStoreId,
                    batchId: batch.id,
                    fileCount: fileIds.length,
                    logLabel,
                });
            }

            const expectedBatchId = batch.id;
            const pollingStartedAtMs = Date.now();
            let latestBatch: OpenAI.Beta.VectorStores.FileBatches.VectorStoreFileBatch | null = batch;
            let lastProgressLogMs = pollingStartedAtMs;
            let shouldPoll = true;

            while (shouldPoll) {
                const nowMs = Date.now();
                const elapsedMs = nowMs - pollingStartedAtMs;

                if (elapsedMs > uploadTimeoutMs) {
                    console.error('[??]', 'Timed out waiting for vector store file batch', {
                        vectorStoreId,
                        batchId: expectedBatchId,
                        elapsedMs,
                        uploadTimeoutMs,
                        logLabel,
                    });

                    await this.logVectorStoreFileBatchDiagnostics({
                        client,
                        vectorStoreId,
                        batchId: expectedBatchId,
                        uploadedFiles,
                        logLabel,
                        reason: 'timeout',
                    });

                    if (this.shouldContinueOnVectorStoreStall()) {
                        console.warn('[??]', 'Continuing despite vector store timeout as requested', {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            logLabel,
                        });
                        return latestBatch;
                    }

                    try {
                        const cancelBatchId = expectedBatchId;
                        if (!cancelBatchId || !cancelBatchId.startsWith('vsb_')) {
                            console.error('[??]', 'Skipping vector store file batch cancel (invalid batch id)', {
                                vectorStoreId,
                                batchId: expectedBatchId,
                                logLabel,
                            });
                        } else {
                            await client.beta.vectorStores.fileBatches.cancel(vectorStoreId, cancelBatchId);
                            console.info('[??]', 'Cancelled vector store file batch after timeout', {
                                vectorStoreId,
                                batchId: cancelBatchId,
                                logLabel,
                            });
                        }
                    } catch (error) {
                        assertsError(error);
                        console.error('[??]', 'Failed to cancel vector store file batch after timeout', {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            logLabel,
                            error: serializeError(error),
                        });
                    }

                    shouldPoll = false;
                    continue;
                }

                try {
                    const batchStatus = await client.beta.vectorStores.fileBatches.retrieve(
                        vectorStoreId,
                        expectedBatchId,
                    );

                    // Note: Sometimes OpenAI returns Vector Store object instead of Batch object, or IDs get swapped.
                    const batchIdMismatch =
                        batchStatus.id !== undefined && expectedBatchId && batchStatus.id !== expectedBatchId;
                    const returnedBatchId = batchIdMismatch ? batchStatus.id : undefined;

                    if (batchIdMismatch) {
                        console.error('[??]', 'Vector store file batch id mismatch', {
                            vectorStoreId,
                            expectedBatchId,
                            returnedBatchId,
                            logLabel,
                        });
                    }

                    latestBatch = batchStatus;

                    if (nowMs - lastProgressLogMs >= VECTOR_STORE_PROGRESS_LOG_INTERVAL_MIN_MS) {
                        lastProgressLogMs = nowMs;
                        const fileCounts = batchStatus.file_counts as TODO_any;
                        console.info('[??]', 'Vector store file batch status', {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            status: batchStatus.status,
                            processedFiles: fileCounts?.processed ?? fileCounts?.completed ?? 0,
                            totalFiles: batchStatus.file_counts?.total ?? fileCount,
                            elapsedMs,
                            logLabel,
                        });
                    }

                    if (batchStatus.status === 'completed') {
                        if (batchStatus.file_counts?.failed && batchStatus.file_counts.failed > 0) {
                            console.error('[??]', 'Vector store file batch completed with failures', {
                                vectorStoreId,
                                batchId: expectedBatchId,
                                fileCounts: batchStatus.file_counts,
                                logLabel,
                            });
                            await this.logVectorStoreFileBatchDiagnostics({
                                client,
                                vectorStoreId,
                                batchId: expectedBatchId,
                                uploadedFiles,
                                logLabel,
                                reason: 'error',
                            });
                        } else if (this.options.isVerbose) {
                            console.info('[??]', 'Vector store file batch completed', {
                                vectorStoreId,
                                batchId: expectedBatchId,
                                fileCounts: batchStatus.file_counts,
                                logLabel,
                            });
                        }
                        return latestBatch;
                    }

                    if (batchStatus.status === 'failed' || batchStatus.status === 'cancelled') {
                        console.error('[??]', 'Vector store file batch did not complete', {
                            vectorStoreId,
                            batchId: expectedBatchId,
                            status: batchStatus.status,
                            fileCounts: batchStatus.file_counts,
                            logLabel,
                        });
                        await this.logVectorStoreFileBatchDiagnostics({
                            client,
                            vectorStoreId,
                            batchId: expectedBatchId,
                            uploadedFiles,
                            logLabel,
                            reason: 'error',
                        });
                        return latestBatch;
                    }

                    if (batchStatus.status === 'in_progress') {
                        const batchExpiresAt = (batchStatus as TODO_any).expires_at as number | undefined;
                        const idleMs = nowMs - (batchExpiresAt ? batchExpiresAt * 1000 : nowMs);
                        if (idleMs >= VECTOR_STORE_STALL_LOG_THRESHOLD_MS && this.options.isVerbose) {
                            await this.logVectorStoreFileBatchDiagnostics({
                                client,
                                vectorStoreId,
                                batchId: expectedBatchId,
                                uploadedFiles,
                                logLabel,
                                reason: 'stall',
                            });
                        }
                    }
                } catch (error) {
                    assertsError(error);
                    console.error('[??]', 'Error polling vector store file batch', {
                        vectorStoreId,
                        batchId: expectedBatchId,
                        logLabel,
                        error: serializeError(error),
                    });
                    await this.logVectorStoreFileBatchDiagnostics({
                        client,
                        vectorStoreId,
                        batchId: expectedBatchId,
                        uploadedFiles,
                        logLabel,
                        reason: 'error',
                    });
                    return latestBatch;
                }

                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            }

            return latestBatch;
        } catch (error) {
            assertsError(error);
            console.error('[??]', 'Error uploading files to vector store', {
                vectorStoreId,
                logLabel,
                error: serializeError(error),
            });
            return null;
        } finally {
            if (this.options.isVerbose) {
                console.info('[??]', 'Vector store upload finished', {
                    vectorStoreId,
                    fileCount,
                    completedFiles,
                    elapsedMs: Date.now() - uploadStartedAtMs,
                    logLabel,
                });
            }
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
        const knowledgeSourcesCount = knowledgeSources.length;
        const downloadTimeoutMs = this.getKnowledgeSourceDownloadTimeoutMs();

        if (this.options.isVerbose) {
            console.info('[??]', 'Creating vector store with knowledge sources', {
                name,
                knowledgeSourcesCount,
                downloadTimeoutMs,
                logLabel,
            });
        }

        const vectorStore = await client.beta.vectorStores.create({
            name: `${name} Knowledge Base`,
        });
        const vectorStoreId = vectorStore.id;

        if (this.options.isVerbose) {
            console.info('[??]', 'Vector store created', {
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
                    console.info('[??]', 'Processing knowledge source', {
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
                        console.info('[??]', 'Skipping knowledge source (unsupported type)', {
                            source,
                            sourceType,
                            logLabel,
                        });
                    }
                    /*
                    TODO: [?????] Resolve problem with browser environment
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
                console.error('[??]', 'Error processing knowledge source', {
                    source,
                    logLabel,
                    error: serializeError(error),
                });
            }
        }

        if (this.options.isVerbose) {
            console.info('[??]', 'Finished processing knowledge sources', {
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
                console.info('[??]', 'Uploading files to vector store', {
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
                console.error('[??]', 'Error uploading files to vector store', {
                    vectorStoreId,
                    logLabel,
                    error: serializeError(error),
                });
            }
        } else if (this.options.isVerbose) {
            console.info('[??]', 'No knowledge source files to upload', {
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
