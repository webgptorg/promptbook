/**
 * Shared vector store options for OpenAI tools that manage knowledge sources.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiVectorStoreOptions = {
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
