import type { ToolCall } from '../../../types/ToolCall';
import {
    getToolCallResultDate,
    parseTeamToolResult,
    parseToolCallArguments,
    parseToolCallResult,
} from './toolCallParsing';

/**
 * Utility to format tool call information for user-friendly display.
 */

/**
 * Technical to user-friendly tool names and emojis
 *
 * @private [🧠] Maybe public?
 */
export const TOOL_TITLES: Record<string, { title: string; emoji: string }> = {
    web_search: { title: 'Searching the web', emoji: '🔎' },
    useSearchEngine: { title: 'Searching the web', emoji: '🔎' },
    search: { title: 'Searching the web', emoji: '🔎' },
    useBrowser: { title: 'Browsing the web', emoji: '🌐' },
    browse: { title: 'Browsing the web', emoji: '🌐' },
    fetch_url_content: { title: 'Fetching URL content', emoji: '🌐' },
    run_browser: { title: 'Running browser', emoji: '🌐' },
    get_current_time: { title: 'Checking time', emoji: '🕒' },
    useTime: { title: 'Checking time', emoji: '🕒' },
    send_email: { title: 'Sending email', emoji: '📧' },
    useEmail: { title: 'Sending email', emoji: '📧' },
    // Add more tools here as needed
};

/**
 * Gets the user-friendly text for a tool call chiplet.
 *
 * @private [🧠] Maybe public?
 */
export function getToolCallChipletText(toolCall: ToolCall): string {
    const toolInfo = TOOL_TITLES[toolCall.name];
    const baseTitle = toolInfo?.title || toolCall.name;
    const emoji = toolInfo?.emoji || '🛠️';

    const args = parseToolCallArguments(toolCall);
    const isTimeTool = toolCall.name === 'get_current_time' || toolCall.name === 'useTime';
    const isEmailTool = toolCall.name === 'send_email' || toolCall.name === 'useEmail';
    const resultRaw = parseToolCallResult(toolCall.result);
    const teamResult = parseTeamToolResult(resultRaw);

    if (teamResult?.teammate) {
        const label = teamResult.teammate.label || teamResult.teammate.url || baseTitle;
        const teamEmoji = '🤝';
        return `${teamEmoji} ${label}`.trim();
    }

    if (isTimeTool) {
        const resultDate = getToolCallResultDate(resultRaw);

        if (resultDate) {
            return `${emoji} ${resultDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    }

    if (isEmailTool) {
        if (args.subject) {
            return `${emoji} ${args.subject}`;
        }
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
