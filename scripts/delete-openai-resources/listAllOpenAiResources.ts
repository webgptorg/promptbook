import OpenAI from 'openai';

/**
 * Max number of assistants fetched per page.
 * @private constant of DeleteOpenAiResources
 */
const ASSISTANTS_PAGE_LIMIT = 100;

/**
 * Max number of vector stores fetched per page.
 * @private constant of DeleteOpenAiResources
 */
const VECTOR_STORES_PAGE_LIMIT = 100;

/**
 * Lightweight metadata for a single assistant listed from the API.
 * @private type of DeleteOpenAiResources
 */
export type AssistantSummary = {
    id: string;
    name: string | null;
    model: string;
    createdAt: number;
};

/**
 * Lightweight metadata for a single vector store listed from the API.
 * @private type of DeleteOpenAiResources
 */
export type VectorStoreSummary = {
    id: string;
    name: string | null;
    status: string;
    createdAt: number;
    usageBytes: number;
    fileCount: number;
};

/**
 * Lightweight metadata for a single file listed from the API.
 * @private type of DeleteOpenAiResources
 */
export type FileSummary = {
    id: string;
    filename: string;
    purpose: string;
    createdAt: number;
    bytes: number;
};

/**
 * Grouped OpenAI resources fetched by the script.
 * @private type of DeleteOpenAiResources
 */
export type ListedOpenAiResources = {
    assistants: AssistantSummary[];
    vectorStores: VectorStoreSummary[];
    files: FileSummary[];
};

/**
 * OpenAI assistant payload used by this script.
 * @private type of DeleteOpenAiResources
 */
type OpenAiAssistantListItem = OpenAI.Beta.Assistant;

/**
 * OpenAI vector store payload used by this script.
 * @private type of DeleteOpenAiResources
 */
type OpenAiVectorStoreListItem = OpenAI.Beta.VectorStore;

/**
 * OpenAI file payload used by this script.
 * @private type of DeleteOpenAiResources
 */
type OpenAiFileListItem = OpenAI.FileObject;

/**
 * Fetches all OpenAI resources used by this cleanup script.
 * @private function of DeleteOpenAiResources
 */
export async function listAllOpenAiResources(client: OpenAI): Promise<ListedOpenAiResources> {
    return {
        assistants: await listAllAssistants(client),
        vectorStores: await listAllVectorStores(client),
        files: await listAllFiles(client),
    };
}

/**
 * Fetches all assistants from the OpenAI API, following cursor pagination.
 * @private function of DeleteOpenAiResources
 */
export async function listAllAssistants(client: OpenAI): Promise<AssistantSummary[]> {
    const summaries: AssistantSummary[] = [];
    const assistantsPage = client.beta.assistants.list({ limit: ASSISTANTS_PAGE_LIMIT });

    for await (const assistant of assistantsPage) {
        summaries.push(mapAssistantToSummary(assistant));
    }

    return summaries;
}

/**
 * Fetches all vector stores from the OpenAI API, following cursor pagination.
 * @private function of DeleteOpenAiResources
 */
export async function listAllVectorStores(client: OpenAI): Promise<VectorStoreSummary[]> {
    const summaries: VectorStoreSummary[] = [];
    const vectorStoresPage = client.beta.vectorStores.list({ limit: VECTOR_STORES_PAGE_LIMIT });

    for await (const vectorStore of vectorStoresPage) {
        summaries.push(mapVectorStoreToSummary(vectorStore));
    }

    return summaries;
}

/**
 * Fetches all files from the OpenAI API.
 * @private function of DeleteOpenAiResources
 */
export async function listAllFiles(client: OpenAI): Promise<FileSummary[]> {
    const summaries: FileSummary[] = [];
    const filesPage = client.files.list();

    for await (const file of filesPage) {
        summaries.push(mapFileToSummary(file));
    }

    return summaries;
}

/**
 * Maps the OpenAI assistant payload into the local summary shape.
 * @private function of DeleteOpenAiResources
 */
function mapAssistantToSummary(assistant: OpenAiAssistantListItem): AssistantSummary {
    return {
        id: assistant.id,
        name: assistant.name,
        model: assistant.model,
        createdAt: assistant.created_at,
    };
}

/**
 * Maps the OpenAI vector store payload into the local summary shape.
 * @private function of DeleteOpenAiResources
 */
function mapVectorStoreToSummary(vectorStore: OpenAiVectorStoreListItem): VectorStoreSummary {
    return {
        id: vectorStore.id,
        name: vectorStore.name ?? null,
        status: vectorStore.status,
        createdAt: vectorStore.created_at,
        usageBytes: vectorStore.usage_bytes,
        fileCount: vectorStore.file_counts.total,
    };
}

/**
 * Maps the OpenAI file payload into the local summary shape.
 * @private function of DeleteOpenAiResources
 */
function mapFileToSummary(file: OpenAiFileListItem): FileSummary {
    return {
        id: file.id,
        filename: file.filename,
        purpose: file.purpose,
        createdAt: file.created_at,
        bytes: file.bytes,
    };
}
