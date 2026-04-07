import type { Metadata } from 'next';
import { DEFAULT_CHAT_PAGE_TITLE } from './chatPageTitle';

/**
 * Generates chat-page metadata that overrides the surrounding agent-name title.
 *
 * @returns Metadata for agent chat pages.
 */
export function generateChatMetadata(): Metadata {
    return {
        title: DEFAULT_CHAT_PAGE_TITLE,
    };
}
