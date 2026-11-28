import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { ClientOptions } from 'openai';
import type OpenAI from 'openai';
import type { string_title } from '../../types/string_title';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import { OpenAiVectorStoreFileBatchHandler } from './OpenAiVectorStoreFileBatchHandler';
import { OpenAiVectorStoreKnowledgeSourcePreparer } from './OpenAiVectorStoreKnowledgeSourcePreparer';

/**
 * Constant for default knowledge source download timeout ms.
 */
const DEFAULT_KNOWLEDGE_SOURCE_DOWNLOAD_TIMEOUT_MS = 30000;

/**
 * Constant for default knowledge source upload timeout ms.
 */
const DEFAULT_KNOWLEDGE_SOURCE_UPLOAD_TIMEOUT_MS = 900000;

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

        const knowledgeSourcePreparer = new OpenAiVectorStoreKnowledgeSourcePreparer({
            isVerbose: this.options.isVerbose ?? false,
        });
        const knowledgeSourcePreparation = await knowledgeSourcePreparer.prepareKnowledgeSourceFiles({
            knowledgeSources,
            downloadTimeoutMs,
            logLabel,
        });

        if (knowledgeSourcePreparation.files.length > 0) {
            if (this.options.isVerbose) {
                console.info('[🤰]', 'Uploading files to vector store', {
                    vectorStoreId,
                    fileCount: knowledgeSourcePreparation.files.length,
                    totalBytes: knowledgeSourcePreparation.totalBytes,
                    maxConcurrency: this.getKnowledgeSourceUploadMaxConcurrency(),
                    pollIntervalMs: this.getKnowledgeSourceUploadPollIntervalMs(),
                    uploadTimeoutMs: this.getKnowledgeSourceUploadTimeoutMs(),
                    logLabel,
                });
            }

            const fileBatchHandler = new OpenAiVectorStoreFileBatchHandler({
                isVerbose: this.options.isVerbose ?? false,
                getVectorStoresApi: (innerClient) => this.getVectorStoresApi(innerClient),
            });

            try {
                await fileBatchHandler.uploadKnowledgeSourceFilesToVectorStore({
                    client,
                    vectorStoreId,
                    files: knowledgeSourcePreparation.files,
                    totalBytes: knowledgeSourcePreparation.totalBytes,
                    maxConcurrency: this.getKnowledgeSourceUploadMaxConcurrency(),
                    pollIntervalMs: this.getKnowledgeSourceUploadPollIntervalMs(),
                    uploadTimeoutMs: this.getKnowledgeSourceUploadTimeoutMs(),
                    shouldContinueOnVectorStoreStall: this.shouldContinueOnVectorStoreStall(),
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
                skippedCount: knowledgeSourcePreparation.skippedSources.length,
                logLabel,
            });
        }

        return {
            vectorStoreId,
            uploadedFileCount: knowledgeSourcePreparation.files.length,
            skippedCount: knowledgeSourcePreparation.skippedSources.length,
            totalBytes: knowledgeSourcePreparation.totalBytes,
        };
    }
}
