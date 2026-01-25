import OpenAI from 'openai';
import type { string_title } from '../../../types/typeAliases';

/**
 * Creates a vector store from knowledge sources
 *
 * @param client OpenAI client
 * @param name Name of the vector store
 * @param knowledgeSources List of URLs or file paths
 * @param isVerbose Whether to log progress
 * @returns ID of the created vector store
 * @private
 */
export async function createVectorStore(
    client: OpenAI,
    name: string_title,
    knowledgeSources: ReadonlyArray<string>,
    isVerbose: boolean,
): Promise<string> {
    if (knowledgeSources.length === 0) {
        throw new Error('No knowledge sources provided');
    }

    if (isVerbose) {
        console.info(`📚 Creating vector store with ${knowledgeSources.length} knowledge sources...`);
    }

    // Create a vector store
    const vectorStore = await client.beta.vectorStores.create({
        name: `${name} Knowledge Base`,
    });
    const vectorStoreId = vectorStore.id;

    if (isVerbose) {
        console.info(`✅ Vector store created: ${vectorStoreId}`);
    }

    // Upload files from knowledge sources to the vector store
    const fileStreams: Array<File> = [];
    for (const source of knowledgeSources) {
        try {
            // Check if it's a URL
            if (source.startsWith('http://') || source.startsWith('https://')) {
                // Download the file
                const response = await fetch(source);
                if (!response.ok) {
                    console.error(`Failed to download ${source}: ${response.statusText}`);
                    continue;
                }
                const buffer = await response.arrayBuffer();
                const filename = source.split('/').pop() || 'downloaded-file';
                const blob = new Blob([buffer]);
                const file = new File([blob], filename);
                fileStreams.push(file);
            } else {
                /*
                TODO: [🐱‍🚀] Resolve problem with browser environment
                // Assume it's a local file path
                // Note: This will work in Node.js environment
                // For browser environments, this would need different handling
                const fs = await import('fs');
                const fileStream = fs.createReadStream(source);
                fileStreams.push(fileStream);
                */
            }
        } catch (error) {
            console.error(`Error processing knowledge source ${source}:`, error);
        }
    }

    // Batch upload files to the vector store
    if (fileStreams.length > 0) {
        try {
            await client.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
                files: fileStreams,
            });

            if (isVerbose) {
                console.info(`✅ Uploaded ${fileStreams.length} files to vector store`);
            }
        } catch (error) {
            console.error('Error uploading files to vector store:', error);
        }
    }

    return vectorStoreId;
}
