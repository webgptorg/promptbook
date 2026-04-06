import type { Metadata } from 'next';

/**
 * Title shown in the browser tab for all chat pages.
 *
 * Using a generic "Chat" label intentionally avoids leaking the agent name
 * into the browser tab or history when users are in a conversation context.
 */
export const CHAT_PAGE_TITLE = 'Chat';

/**
 * Generates Next.js metadata for chat pages.
 *
 * Overrides the agent-name title set by the parent `[agentName]` layout so
 * that the browser tab shows "Chat" instead of the agent's display name.
 * This applies to both the standalone chat route and the ChatGPT-like variant,
 * including headless / embedded usages of those routes.
 *
 * @returns Metadata with the `title` field set to {@link CHAT_PAGE_TITLE}.
 */
export function generateChatMetadata(): Metadata {
    return {
        title: CHAT_PAGE_TITLE,
    };
}
