import type { TODO_any } from '../../../utils/organization/TODO_any';

/**
 * Utility to format tool call information for user-friendly display.
 */

/**
 * Technical to user-friendly tool names and emojis
 */
export const TOOL_TITLES: Record<string, { title: string; emoji: string }> = {
    web_search: { title: 'Searching the web', emoji: '🔎' },
    useSearchEngine: { title: 'Searching the web', emoji: '🔎' },
    search: { title: 'Searching the web', emoji: '🔎' },
    useBrowser: { title: 'Browsing the web', emoji: '🌐' },
    browse: { title: 'Browsing the web', emoji: '🌐' },
    // Add more tools here as needed
};

/**
 * Gets the user-friendly text for a tool call chiplet.
 */
export function getToolCallChipletText(toolCall: {
    name: string;
    arguments?: string | Record<string, TODO_any>;
}): string {
    const toolInfo = TOOL_TITLES[toolCall.name];
    const baseTitle = toolInfo?.title || toolCall.name;
    const emoji = toolInfo?.emoji || '🛠️';

    let args: TODO_any = {};
    try {
        args = typeof toolCall.arguments === 'string' ? JSON.parse(toolCall.arguments) : toolCall.arguments || {};
    } catch (e) {
        // Ignore parse errors
    }

    if (args.query) {
        return `${emoji} ${args.query}`;
    }

    if (args.url) {
        try {
            const url = new URL(args.url);
            return `${emoji} ${url.hostname}`;
        } catch (e) {
            return `${emoji} ${args.url}`;
        }
    }

    return `${emoji} ${baseTitle}`;
}
