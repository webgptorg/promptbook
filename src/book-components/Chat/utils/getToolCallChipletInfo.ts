import { ASSISTANT_PREPARATION_TOOL_CALL_NAME, type ToolCall } from '../../../types/ToolCall';
import type { AgentChipData } from '../AgentChip';
import {
    getToolCallResultDate,
    parseTeamToolResult,
    parseToolCallArguments,
    parseToolCallResult,
} from './toolCallParsing';

const MEMORY_CHIP_MAX_LENGTH = 48;
const MEMORY_CHIP_TRUNCATE_LENGTH = 45;

/**
 * Tool call chiplet information including agent data for team tools
 *
 * @private utility of `<Chat/>`
 */
export type ToolCallChipletInfo = {
    /**
     * Display text for the chiplet.
     */
    text: string;

    /**
     * Agent data for team tools (if applicable).
     */
    agentData?: AgentChipData;
};

/**
 * Builds display text for a tool call chiplet.
 *
 * @param chipletInfo - Chiplet metadata for the tool call.
 *
 * @private utility of `<Chat/>`
 */
export function buildToolCallChipText(chipletInfo: ToolCallChipletInfo): string {
    return chipletInfo.text;
}

/**
 * Technical to user-friendly tool names and emojis
 *
 * @private utility of `<Chat/>` [🧠] Maybe public?
 */
export const TOOL_TITLES: Record<string, { title: string; emoji: string }> = {
    [ASSISTANT_PREPARATION_TOOL_CALL_NAME]: { title: 'Preparing agent', emoji: '...' },
    'self-learning': { title: 'self-learning', emoji: '🧠' },
    retrieve_user_memory: { title: 'Reading memory', emoji: '🧠' },
    store_user_memory: { title: 'Storing memory', emoji: '🧠' },
    web_search: { title: 'Searching the web', emoji: '🔎' },
    useSearchEngine: { title: 'Searching the web', emoji: '🔎' },
    search: { title: 'Searching the web', emoji: '🔎' },
    useBrowser: { title: 'Browsing the web', emoji: '🌐' },
    browse: { title: 'Browsing the web', emoji: '🌐' },
    fetch_url_content: { title: 'Fetching URL content', emoji: '🌐' },
    run_browser: { title: 'Running browser', emoji: '🌐' },
    get_current_time: { title: 'Checking time', emoji: '🕒' },
    useTime: { title: 'Checking time', emoji: '🕒' },
    get_user_location: { title: 'Checking location', emoji: '📍' },
    send_email: { title: 'Sending email', emoji: '📧' },
    useEmail: { title: 'Sending email', emoji: '📧' },
    // Add more tools here as needed
};

/**
 * Gets the chiplet information including text and agent data (for team tools).
 *
 * @private [🧠] Maybe public?
 */
export function getToolCallChipletInfo(toolCall: ToolCall): ToolCallChipletInfo {
    const toolInfo = TOOL_TITLES[toolCall.name];
    const baseTitle = toolInfo?.title || toolCall.name;
    const emoji = toolInfo?.emoji || '🛠️';

    const args = parseToolCallArguments(toolCall);
    const isTimeTool = toolCall.name === 'get_current_time' || toolCall.name === 'useTime';
    const isEmailTool = toolCall.name === 'send_email' || toolCall.name === 'useEmail';
    const isMemoryTool = toolCall.name === 'retrieve_user_memory' || toolCall.name === 'store_user_memory';
    const resultRaw = parseToolCallResult(toolCall.result);
    const teamResult = parseTeamToolResult(resultRaw);

    if (teamResult?.teammate) {
        const label = teamResult.teammate.label || teamResult.teammate.url || baseTitle;
        const agentData: AgentChipData = {
            url: teamResult.teammate.url as string,
            label,
        };
        return {
            text: label,
            agentData,
        };
    }

    if (isTimeTool) {
        const resultDate = getToolCallResultDate(resultRaw);

        if (resultDate) {
            return {
                text: `${emoji} ${resultDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            };
        }
    }

    if (isEmailTool) {
        if (args.subject) {
            return {
                text: `${emoji} ${args.subject}`,
            };
        }
    }

    if (isMemoryTool) {
        const memoryPreview = getMemoryPreviewText(args, resultRaw);

        if (memoryPreview) {
            return {
                text: `${emoji} ${memoryPreview}`,
            };
        }
    }

    if (args.query) {
        return {
            text: `${emoji} ${args.query}`,
        };
    }

    if (args.url) {
        try {
            const url = new URL(args.url);
            return {
                text: `${emoji} ${url.hostname}`,
            };
        } catch (e) {
            return {
                text: `${emoji} ${args.url}`,
            };
        }
    }

    return {
        text: `${emoji} ${baseTitle}`,
    };
}

/**
 * Builds memory preview text for MEMORY commitment tool calls.
 */
function getMemoryPreviewText(args: Record<string, unknown>, resultRaw: unknown): string | null {
    if (!resultRaw || typeof resultRaw !== 'object') {
        return typeof args.content === 'string' ? shortenMemoryPreview(args.content) : null;
    }

    const result = resultRaw as {
        action?: string;
        memory?: { content?: string };
        memories?: Array<{ content?: string }>;
        query?: string;
    };

    if (result.action === 'store') {
        const content = result.memory?.content || (typeof args.content === 'string' ? args.content : '');
        return content ? shortenMemoryPreview(content) : null;
    }

    const firstMemoryContent = result.memories?.find((memory) => typeof memory.content === 'string')?.content;
    if (firstMemoryContent) {
        return shortenMemoryPreview(firstMemoryContent);
    }

    if (typeof result.query === 'string' && result.query.trim()) {
        return `No match for "${result.query.trim()}"`;
    }

    return null;
}

/**
 * Shortens long memory content for compact chip display.
 */
function shortenMemoryPreview(content: string): string {
    const trimmed = content.trim().replace(/\s+/g, ' ');

    if (trimmed.length <= MEMORY_CHIP_MAX_LENGTH) {
        return trimmed;
    }

    return `${trimmed.slice(0, MEMORY_CHIP_TRUNCATE_LENGTH)}...`;
}
