import type OpenAI from 'openai';
import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { OpenAiVectorStoreFileBatchPoller } from './OpenAiVectorStoreFileBatchPoller';

/**
 * Metadata for uploaded knowledge source files used for vector store diagnostics.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
type KnowledgeSourceUploadMetadata = {
    readonly fileId: string;
    readonly filename: string;
    readonly sizeBytes?: number;
};

/**
 * Aggregated upload totals grouped by normalized file extension.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
type KnowledgeSourceFileTypeSummary = Record<string, { count: number; totalBytes: number }>;

/**
 * One failed knowledge-source upload attempt.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
type KnowledgeSourceUploadFailure = {
    readonly index: number;
    readonly filename: string;
    readonly error: ReturnType<typeof serializeError>;
};

/**
 * Accumulated result of uploading prepared knowledge-source files.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
type KnowledgeSourceFilesUploadResult = {
    readonly fileIds: string[];
    readonly uploadedFiles: KnowledgeSourceUploadMetadata[];
    readonly failedUploads: KnowledgeSourceUploadFailure[];
};

/**
 * Result of creating the vector store file batch that tracks uploaded knowledge sources.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
type CreatedVectorStoreFileBatch = {
    readonly batch: TODO_any;
    readonly expectedBatchId: string;
    readonly isExpectedBatchIdValid: boolean;
};

/**
 * Resolves the filename bucket used in upload summaries and diagnostics.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
function resolveKnowledgeSourceFileExtension(filename: string): string {
    return filename.includes('.') ? filename.split('.').pop()?.toLowerCase() ?? 'unknown' : 'unknown';
}

/**
 * Returns the fallback filename used when a knowledge-source `File` has no name.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
 */
function resolveKnowledgeSourceUploadFilename(file: File, uploadIndex: number): string {
    return file.name || `knowledge-source-${uploadIndex}`;
}

/**
 * Creates an extension summary for the prepared knowledge-source files.
 *
 * @private internal utility of `OpenAiVectorStoreFileBatchHandler`
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
 * Uploads prepared knowledge-source files and starts vector-store ingestion polling.
 *
 * @private helper of `OpenAiVectorStoreHandler`
 */
export class OpenAiVectorStoreFileBatchHandler {
    /**
     * Creates one vector-store file-batch handler instance.
     */
    public constructor(
        private readonly options: {
            readonly isVerbose: boolean;
            readonly getVectorStoresApi: (client: OpenAI) => TODO_any;
        },
    ) {}

    /**
     * Uploads knowledge source files to the vector store and polls until processing completes.
     */
    public async uploadKnowledgeSourceFilesToVectorStore(options: {
        readonly client: OpenAI;
        readonly vectorStoreId: string;
        readonly files: ReadonlyArray<File>;
        readonly totalBytes: number;
        readonly maxConcurrency: number;
        readonly pollIntervalMs: number;
        readonly uploadTimeoutMs: number;
        readonly shouldContinueOnVectorStoreStall: boolean;
        readonly logLabel: string;
    }): Promise<TODO_any | null> {
        const {
            client,
            vectorStoreId,
            files,
            totalBytes,
            maxConcurrency,
            pollIntervalMs,
            uploadTimeoutMs,
            shouldContinueOnVectorStoreStall,
            logLabel,
        } = options;
        const uploadStartedAtMs = Date.now();

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

        const poller = new OpenAiVectorStoreFileBatchPoller(this.options);
        return poller.pollVectorStoreFileBatchUntilSettled({
            client,
            vectorStoreId,
            batch: createdBatch.batch,
            expectedBatchId: createdBatch.expectedBatchId,
            isExpectedBatchIdValid: createdBatch.isExpectedBatchIdValid,
            uploadedFiles: uploadResult.uploadedFiles,
            pollIntervalMs,
            uploadTimeoutMs,
            shouldContinueOnVectorStoreStall,
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
        const vectorStores = this.options.getVectorStoresApi(client);
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
        const isExpectedBatchIdValid =
            typeof expectedBatchId === 'string' && expectedBatchId.startsWith('vsfb_');

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
}
