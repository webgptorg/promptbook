import OpenAI from 'openai';

/**
 * Uploads files to OpenAI and returns their IDs
 *
 * @private utility for `OpenAiAssistantExecutionTools` and `OpenAiCompatibleExecutionTools`
 */
export async function uploadFilesToOpenAi(client: OpenAI, files: Array<File>): Promise<Array<string>> {
    const fileIds: Array<string> = [];

    for (const file of files) {
        // Note: OpenAI API expects a File object or a ReadStream
        // In browser environment, we can pass the File object directly
        // In Node.js environment, we might need to convert it or use a different approach
        // But since `Prompt.files` already contains `File` objects, we try to pass them directly

        const uploadedFile = await client.files.create({
            file: file,
            purpose: 'assistants',
        });

        fileIds.push(uploadedFile.id);
    }

    return fileIds;
}
