import { bookEditorUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';

/**
 * Uploaded knowledge file returned to the imported manGo wizard.
 */
export type UploadedFile = {
    /**
     * Public URL inserted into the generated `KNOWLEDGE` commitment.
     */
    readonly publicUrl: string;

    /**
     * Original experiment field retained for the imported UI state shape.
     */
    readonly objectKey: string;
};

/**
 * Uploads one knowledge file through the Agents Server upload endpoint.
 *
 * @param file - Browser file selected in the knowledge step.
 * @returns Public URL consumed by `KNOWLEDGE` commitments.
 */
export async function uploadKnowledgeFile(file: File): Promise<UploadedFile> {
    const publicUrl = await bookEditorUploadHandler(file);
    return { publicUrl, objectKey: '' };
}
