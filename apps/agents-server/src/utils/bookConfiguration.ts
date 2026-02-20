import { getMetadataMap } from '../database/getMetadata';

const BOOK_ALLOW_DOCUMENT_UPLOADS_KEY = 'BOOK_ALLOW_DOCUMENT_UPLOADS';
const BOOK_ALLOW_IMAGE_UPLOADS_KEY = 'BOOK_ALLOW_IMAGE_UPLOADS';

/**
 * Parses boolean metadata values from the database, defaulting when missing or malformed.
 *
 * @param raw - Raw metadata value from Supabase.
 * @param fallback - Default value when parsing fails.
 * @returns Normalized boolean flag.
 */
function parseBooleanMetadata(raw: string | null, fallback: boolean): boolean {
    if (raw === 'true') {
        return true;
    }

    if (raw === 'false') {
        return false;
    }

    return fallback;
}

/**
 * Book editor configuration values sourced from metadata.
 */
export type BookConfiguration = {
    readonly allowDocumentUploads: boolean;
    readonly allowCameraUploads: boolean;
};

/**
 * Loads the shared book metadata flags that control rich content uploads.
 */
export async function loadBookConfiguration(): Promise<BookConfiguration> {
    const metadata = await getMetadataMap([BOOK_ALLOW_DOCUMENT_UPLOADS_KEY, BOOK_ALLOW_IMAGE_UPLOADS_KEY]);

    return {
        allowDocumentUploads: parseBooleanMetadata(metadata[BOOK_ALLOW_DOCUMENT_UPLOADS_KEY], true),
        allowCameraUploads: parseBooleanMetadata(metadata[BOOK_ALLOW_IMAGE_UPLOADS_KEY], true),
    };
}
