import type { ClientOptions } from 'openai';
import type { string_token } from '../../types/typeAliases';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';

/**
 * Options for `createOpenAiAssistantExecutionTools` and `OpenAiAssistantExecutionTools`
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiAssistantExecutionToolsOptions = OpenAiCompatibleExecutionToolsOptions &
    ClientOptions & {
        /**
         * Whether creating new assistants is allowed
         *
         * @default false
         */
        readonly isCreatingNewAssistantsAllowed: boolean;

        /**
         * Which assistant to use
         */
        readonly assistantId: string_token;
        // <- TODO: [🧠] This should be maybe more like model for each prompt?

        /**
         * Per-knowledge-source download timeout in milliseconds when preparing assistants.
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
