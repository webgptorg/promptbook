#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import OpenAI from 'openai';
import { join } from 'path';
import { createInterface } from 'readline';

const ASSISTANTS_PAGE_LIMIT = 100;
const VECTOR_STORES_PAGE_LIMIT = 100;
const ROOT_DIR = join(__dirname, '../..');

main()
    .catch((error) => {
        const message = formatError(error);
        console.error(colors.bgRed('Delete OpenAI resources failed'));
        console.error(colors.red(message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Lightweight metadata for a single assistant listed from the API.
 */
type AssistantSummary = {
    id: string;
    name: string | null;
    model: string;
    createdAt: number;
};

/**
 * Lightweight metadata for a single vector store listed from the API.
 */
type VectorStoreSummary = {
    id: string;
    name: string | null;
    status: string;
    createdAt: number;
    usageBytes: number;
    fileCount: number;
};

/**
 * Lightweight metadata for a single file listed from the API.
 */
type FileSummary = {
    id: string;
    filename: string;
    purpose: string;
    createdAt: number;
    bytes: number;
};

/**
 * Captures a deletion failure for a specific resource.
 */
type DeletionFailure<TSummary extends { id: string }> = {
    item: TSummary;
    reason: string;
};

/**
 * Result of a bulk deletion run.
 */
type DeletionResult<TSummary extends { id: string }> = {
    deleted: TSummary[];
    failed: DeletionFailure<TSummary>[];
};

/**
 * Configuration for a sequential deletion task.
 */
type DeletionTask<TSummary extends { id: string }> = {
    label: string;
    items: TSummary[];
    deleteItem: (item: TSummary) => Promise<void>;
};

/**
 * OpenAI assistant payload used by this script.
 */
type OpenAiAssistantListItem = OpenAI.Beta.Assistant;

/**
 * OpenAI vector store payload used by this script.
 */
type OpenAiVectorStoreListItem = OpenAI.Beta.VectorStore;

/**
 * OpenAI file payload used by this script.
 */
type OpenAiFileListItem = OpenAI.FileObject;

/**
 * Orchestrates listing, confirmation, and deletion of OpenAI resources.
 */
async function main(): Promise<void> {
    ensureRootCwd();

    const apiKey = getOpenAiApiKey();
    const client = new OpenAI({ apiKey });

    const assistants = await listAllAssistants(client);
    console.info(colors.cyan(`Found ${assistants.length} assistant(s).`));

    const vectorStores = await listAllVectorStores(client);
    console.info(colors.cyan(`Found ${vectorStores.length} vector store(s).`));

    const files = await listAllFiles(client);
    console.info(colors.cyan(`Found ${files.length} file(s).`));

    if (assistants.length === 0 && vectorStores.length === 0 && files.length === 0) {
        console.info(colors.green('No OpenAI resources to delete.'));
        return;
    }

    if (assistants.length > 0) {
        printSummary('Assistants to be deleted:', assistants, formatAssistantSummaryLine);
    }

    if (vectorStores.length > 0) {
        printSummary('Vector stores to be deleted:', vectorStores, formatVectorStoreSummaryLine);
    }

    if (files.length > 0) {
        printSummary('Files to be deleted:', files, formatFileSummaryLine);
    }

    const confirmed = await promptForConfirmation(
        `Delete ${assistants.length} assistant(s), ${vectorStores.length} vector store(s), and ${files.length} file(s)? Type "y" to confirm: `,
    );

    if (!confirmed) {
        console.info(colors.yellow('Aborted. No resources were deleted.'));
        return;
    }

    const assistantResult = await deleteSequentially({
        label: 'assistant',
        items: assistants,
        deleteItem: (assistant) => client.beta.assistants.del(assistant.id),
    });
    logDeletionSummary('assistant', assistantResult);

    const vectorStoreResult = await deleteSequentially({
        label: 'vector store',
        items: vectorStores,
        deleteItem: (vectorStore) => client.beta.vectorStores.del(vectorStore.id),
    });
    logDeletionSummary('vector store', vectorStoreResult);

    const fileResult = await deleteSequentially({
        label: 'file',
        items: files,
        deleteItem: (file) => client.files.del(file.id),
    });
    logDeletionSummary('file', fileResult);
}

/**
 * Ensures the script is executed from the repository root.
 */
function ensureRootCwd(): void {
    if (process.cwd() !== ROOT_DIR) {
        console.error(colors.red('CWD must be root of the project.'));
        process.exit(1);
    }
}

/**
 * Reads the OpenAI API key from the environment.
 */
function getOpenAiApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in the environment.');
    }
    return apiKey;
}

/**
 * Fetches all assistants from the OpenAI API, following cursor pagination.
 */
async function listAllAssistants(client: OpenAI): Promise<AssistantSummary[]> {
    const summaries: AssistantSummary[] = [];
    const assistantsPage = client.beta.assistants.list({ limit: ASSISTANTS_PAGE_LIMIT });

    for await (const assistant of assistantsPage) {
        summaries.push(mapAssistantToSummary(assistant));
    }

    return summaries;
}

/**
 * Fetches all vector stores from the OpenAI API, following cursor pagination.
 */
async function listAllVectorStores(client: OpenAI): Promise<VectorStoreSummary[]> {
    const summaries: VectorStoreSummary[] = [];
    const vectorStoresPage = client.beta.vectorStores.list({ limit: VECTOR_STORES_PAGE_LIMIT });

    for await (const vectorStore of vectorStoresPage) {
        summaries.push(mapVectorStoreToSummary(vectorStore));
    }

    return summaries;
}

/**
 * Fetches all files from the OpenAI API.
 */
async function listAllFiles(client: OpenAI): Promise<FileSummary[]> {
    const summaries: FileSummary[] = [];
    const filesPage = client.files.list();

    for await (const file of filesPage) {
        summaries.push(mapFileToSummary(file));
    }

    return summaries;
}

/**
 * Maps the OpenAI assistant payload into the local summary shape.
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

/**
 * Prints a summary list of resources scheduled for deletion.
 */
function printSummary<TSummary>(
    heading: string,
    items: TSummary[],
    formatLine: (item: TSummary) => string,
): void {
    console.info(colors.yellow(heading));
    for (const item of items) {
        console.info(`- ${formatLine(item)}`);
    }
}

/**
 * Formats an assistant summary into a single display line.
 */
function formatAssistantSummaryLine(assistant: AssistantSummary): string {
    const name = assistant.name?.trim() || '(unnamed)';
    const createdAt = new Date(assistant.createdAt * 1000).toISOString();
    return `${assistant.id} | ${name} | ${assistant.model} | ${createdAt}`;
}

/**
 * Formats a vector store summary into a single display line.
 */
function formatVectorStoreSummaryLine(vectorStore: VectorStoreSummary): string {
    const name = vectorStore.name?.trim() || '(unnamed)';
    const createdAt = new Date(vectorStore.createdAt * 1000).toISOString();
    const usage = formatBytes(vectorStore.usageBytes);
    return `${vectorStore.id} | ${name} | ${vectorStore.status} | files: ${vectorStore.fileCount} | ${usage} | ${createdAt}`;
}

/**
 * Formats a file summary into a single display line.
 */
function formatFileSummaryLine(file: FileSummary): string {
    const createdAt = new Date(file.createdAt * 1000).toISOString();
    const size = formatBytes(file.bytes);
    return `${file.id} | ${file.filename} | ${file.purpose} | ${size} | ${createdAt}`;
}

/**
 * Prompts for a yes/no confirmation using stdin.
 */
async function promptForConfirmation(promptText: string): Promise<boolean> {
    const answer = await askQuestion(promptText);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
}

/**
 * Asks a single question on stdin and resolves with the user response.
 */
async function askQuestion(promptText: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(promptText, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Deletes resources sequentially, logging each deletion outcome.
 */
async function deleteSequentially<TSummary extends { id: string }>(
    task: DeletionTask<TSummary>,
): Promise<DeletionResult<TSummary>> {
    const deleted: TSummary[] = [];
    const failed: DeletionFailure<TSummary>[] = [];

    for (const item of task.items) {
        const id = item.id;
        console.info(colors.gray(`Deleting ${task.label} ${id}...`));
        try {
            await task.deleteItem(item);
            console.info(colors.green(`Deleted ${task.label} ${id}.`));
            deleted.push(item);
        } catch (error) {
            const reason = formatError(error);
            console.error(colors.red(`Failed to delete ${task.label} ${id}: ${reason}`));
            failed.push({ item, reason });
        }
    }

    return { deleted, failed };
}

/**
 * Logs a summary of deletion successes and failures.
 */
function logDeletionSummary<TSummary extends { id: string }>(label: string, result: DeletionResult<TSummary>): void {
    console.info(colors.cyan(`Deleted ${result.deleted.length} ${label}(s).`));

    if (result.failed.length > 0) {
        console.info(colors.red(`Failed to delete ${result.failed.length} ${label}(s):`));
        for (const failure of result.failed) {
            console.info(`- ${formatDeletionFailure(failure)}`);
        }
    }
}

/**
 * Formats a deletion failure into a single display line.
 */
function formatDeletionFailure<TSummary extends { id: string }>(failure: DeletionFailure<TSummary>): string {
    return `${failure.item.id}: ${failure.reason}`;
}

/**
 * Formats bytes into a human-readable string.
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(1)} ${units[exponent]}`;
}

/**
 * Formats unknown errors into a readable message.
 */
function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack || error.message;
    }
    return String(error);
}
