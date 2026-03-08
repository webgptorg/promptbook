import colors from 'colors';
import { assertRootCwd } from './assertRootCwd';
import { createOpenAiClient } from './createOpenAiClient';
import { deleteSequentially } from './deleteSequentially';
import { listAllAssistants, listAllFiles, listAllVectorStores } from './listAllOpenAiResources';
import { logDeletionSummary } from './logDeletionSummary';
import { printOpenAiResourceSummaries } from './printOpenAiResourceSummaries';
import { promptForConfirmation } from './promptForConfirmation';

/**
 * Orchestrates listing, confirmation, and deletion of OpenAI resources.
 * @private function of DeleteOpenAiResources
 */
export async function deleteOpenAiResources(): Promise<void> {
    assertRootCwd();

    const client = createOpenAiClient();
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

    printOpenAiResourceSummaries({ assistants, vectorStores, files });

    const confirmed = await promptForConfirmation(
        `Delete ${assistants.length} assistant(s), ${vectorStores.length} vector store(s), and ${files.length} file(s)? Type "y" to confirm: `,
    );

    if (!confirmed) {
        console.info(colors.yellow('Aborted. No resources were deleted.'));
        return;
    }

    const totalCount = assistants.length + vectorStores.length + files.length;
    let currentIndex = 0;

    const assistantResult = await deleteSequentially({
        label: 'assistant',
        items: assistants,
        deleteItem: async (assistant) => {
            await client.beta.assistants.del(assistant.id);
        },
        startIndex: currentIndex,
        totalCount,
    });
    currentIndex += assistants.length;
    logDeletionSummary('assistant', assistantResult);

    const vectorStoreResult = await deleteSequentially({
        label: 'vector store',
        items: vectorStores,
        deleteItem: async (vectorStore) => {
            await client.beta.vectorStores.del(vectorStore.id);
        },
        startIndex: currentIndex,
        totalCount,
    });
    currentIndex += vectorStores.length;
    logDeletionSummary('vector store', vectorStoreResult);

    const fileResult = await deleteSequentially({
        label: 'file',
        items: files,
        deleteItem: async (file) => {
            await client.files.del(file.id);
        },
        startIndex: currentIndex,
        totalCount,
    });
    logDeletionSummary('file', fileResult);
}
