import type { Metadata, ResolvingMetadata } from 'next';
import { createChatDocumentTitle } from './chatPageTitle';

/**
 * Generates chat-page metadata that rewrites the leading title segment to the active chat context.
 *
 * @param parent - Resolved inherited metadata from parent layouts.
 * @returns Metadata for agent chat pages.
 */
export async function generateChatMetadata(parent: ResolvingMetadata): Promise<Metadata> {
    const parentMetadata = await parent;

    return {
        title: {
            absolute: createChatDocumentTitle({
                baseDocumentTitle: parentMetadata.title?.absolute,
            }),
        },
    };
}
