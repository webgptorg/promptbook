import colors from 'colors';
import {
    AssistantSummary,
    FileSummary,
    ListedOpenAiResources,
    VectorStoreSummary,
} from './listAllOpenAiResources';

/**
 * Prints all resource summaries that are about to be deleted.
 * @private function of DeleteOpenAiResources
 */
export function printOpenAiResourceSummaries(resources: ListedOpenAiResources): void {
    const { assistants, vectorStores, files } = resources;

    if (assistants.length > 0) {
        printSummary('Assistants to be deleted:', assistants, formatAssistantSummaryLine);
    }

    if (vectorStores.length > 0) {
        printSummary('Vector stores to be deleted:', vectorStores, formatVectorStoreSummaryLine);
    }

    if (files.length > 0) {
        printSummary('Files to be deleted:', files, formatFileSummaryLine);
    }
}

/**
 * Prints a summary list of resources scheduled for deletion.
 * @private function of DeleteOpenAiResources
 */
function printSummary<TSummary>(heading: string, items: TSummary[], formatLine: (item: TSummary) => string): void {
    console.info(colors.yellow(heading));

    for (const item of items) {
        console.info(`- ${formatLine(item)}`);
    }
}

/**
 * Formats an assistant summary into a single display line.
 * @private function of DeleteOpenAiResources
 */
function formatAssistantSummaryLine(assistant: AssistantSummary): string {
    const name = assistant.name?.trim() || '(unnamed)';
    const createdAt = new Date(assistant.createdAt * 1000).toISOString();
    return `${assistant.id} | ${name} | ${assistant.model} | ${createdAt}`;
}

/**
 * Formats a vector store summary into a single display line.
 * @private function of DeleteOpenAiResources
 */
function formatVectorStoreSummaryLine(vectorStore: VectorStoreSummary): string {
    const name = vectorStore.name?.trim() || '(unnamed)';
    const createdAt = new Date(vectorStore.createdAt * 1000).toISOString();
    const usage = formatBytes(vectorStore.usageBytes);
    return `${vectorStore.id} | ${name} | ${vectorStore.status} | files: ${vectorStore.fileCount} | ${usage} | ${createdAt}`;
}

/**
 * Formats a file summary into a single display line.
 * @private function of DeleteOpenAiResources
 */
function formatFileSummaryLine(file: FileSummary): string {
    const createdAt = new Date(file.createdAt * 1000).toISOString();
    const size = formatBytes(file.bytes);
    return `${file.id} | ${file.filename} | ${file.purpose} | ${size} | ${createdAt}`;
}

/**
 * Formats bytes into a human-readable string.
 * @private function of DeleteOpenAiResources
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

