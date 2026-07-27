import type { ToolCall } from '../../../types/ToolCall';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../types/ToolCall';
import type { AgentChipData } from '../AgentChip/AgentChip';
import { formatToolCallLocalTime } from './formatToolCallLocalTime';
import { formatToolCallTranslationTemplate } from './formatToolCallTranslationTemplate';
import {
    buildTimeoutToolCallChipLabel,
    isTimeoutToolCallName,
    resolveTimeoutToolCallPresentation,
} from './timeoutToolCallPresentation';
import { getToolCallResultDate } from './toolCallParsing/getToolCallResultDate';
import { parseTeamToolResult } from './toolCallParsing/parseTeamToolResult';
import { parseToolCallArguments } from './toolCallParsing/parseToolCallArguments';
import { parseToolCallResult } from './toolCallParsing/parseToolCallResult';
import { parseWalletCredentialToolCallResult, WALLET_CREDENTIAL_TOOL_CALL_NAME } from './walletCredentialToolCall';

/**
 * Length of memory chip max.
 */
const MEMORY_CHIP_MAX_LENGTH = 48;
/**
 * Length of memory chip truncate.
 */
const MEMORY_CHIP_TRUNCATE_LENGTH = 45;

/**
 * Tool names that render a localized current-time chip.
 *
 * @private utility of `<Chat/>`
 */
const TIME_TOOL_CALL_NAMES = new Set(['get_current_time', 'useTime']);

/**
 * Tool names that render the email subject when available.
 *
 * @private utility of `<Chat/>`
 */
const EMAIL_TOOL_CALL_NAMES = new Set(['send_email', 'useEmail']);

/**
 * Tool names that render a memory preview.
 *
 * @private utility of `<Chat/>`
 */
const MEMORY_TOOL_CALL_NAMES = new Set(['retrieve_user_memory', 'store_user_memory']);

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
 * Optional user-facing title overrides for technical tool names.
 *
 * @private utility of `<Chat/>`
 */
type ToolCallTitleOverrides = Readonly<Record<string, string>>;

/**
 * Optional localized labels used for user-facing chip text.
 *
 * @private utility of `<Chat/>`
 */
type ToolCallChipTranslations = {
    readonly toolCallTimeChipLabel?: string;
    readonly toolCallTimeoutChipLabel?: string;
    readonly toolCallTimeoutChipCancelledLabel?: string;
    readonly toolCallTimeoutChipInactiveLabel?: string;
    readonly toolCallTimeoutChipUpdatedLabel?: string;
    readonly toolCallTimeoutChipFallbackLabel?: string;
};

/**
 * Parsed values reused while resolving a chiplet label.
 *
 * @private utility of `<Chat/>`
 */
type ToolCallChipletContext = {
    readonly toolCall: ToolCall;
    readonly locale?: string;
    readonly chipTranslations?: ToolCallChipTranslations;
    readonly baseTitle: string;
    readonly emoji: string;
    readonly args: Record<string, unknown>;
    readonly resultRaw: unknown;
    readonly timeoutPresentation: ReturnType<typeof resolveTimeoutToolCallPresentation>;
};

/**
 * Resolves one specialized chiplet variant from the shared context.
 *
 * @private utility of `<Chat/>`
 */
type ToolCallChipletResolver = (context: ToolCallChipletContext) => ToolCallChipletInfo | null;

/**
 * Ordered specialized chiplet resolvers evaluated before the generic fallback.
 *
 * @private utility of `<Chat/>`
 */
const SPECIALIZED_TOOL_CALL_CHIPLET_RESOLVERS: ReadonlyArray<ToolCallChipletResolver> = [
    resolveWalletCredentialChipletInfo,
    resolveTeamToolCallChipletInfo,
    resolveTimeToolCallChipletInfo,
    resolveEmailToolCallChipletInfo,
    resolveMemoryToolCallChipletInfo,
    resolveTimeoutToolCallChipletInfo,
    resolveQueryToolCallChipletInfo,
    resolveUrlToolCallChipletInfo,
];

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
    [ASSISTANT_PREPARATION_TOOL_CALL_NAME]: { title: 'Preparing agent', emoji: '✨' },
    [WALLET_CREDENTIAL_TOOL_CALL_NAME]: { title: 'Credential used', emoji: '🔐' },
    'self-learning': { title: 'self-learning', emoji: '🧠' },
    retrieve_user_memory: { title: 'Reading memory', emoji: '🧠' },
    store_user_memory: { title: 'Storing memory', emoji: '🧠' },
    retrieve_wallet_records: { title: 'Reading wallet', emoji: '👛' },
    store_wallet_record: { title: 'Storing wallet', emoji: '👛' },
    update_wallet_record: { title: 'Updating wallet', emoji: '👛' },
    delete_wallet_record: { title: 'Deleting wallet', emoji: '👛' },
    request_wallet_record: { title: 'Requesting wallet', emoji: '👛' },
    web_search: { title: 'Searching the web', emoji: '🔎' },
    deep_search: { title: 'Deep research', emoji: '🔬' },
    useSearchEngine: { title: 'Searching the web', emoji: '🔎' },
    search: { title: 'Searching the web', emoji: '🔎' },
    useBrowser: { title: 'Browsing the web', emoji: '🌐' },
    browse: { title: 'Browsing the web', emoji: '🌐' },
    fetch_url_content: { title: 'Fetching URL content', emoji: '🌐' },
    run_browser: { title: 'Running browser', emoji: '🌐' },
    get_current_time: { title: 'Checking time', emoji: '🕒' },
    useTime: { title: 'Checking time', emoji: '🕒' },
    set_timeout: { title: 'Setting timer', emoji: '⏱️' },
    cancel_timeout: { title: 'Cancelling timer', emoji: '⏱️' },
    list_timeouts: { title: 'Listing timers', emoji: '⏱️' },
    update_timeout: { title: 'Updating timer', emoji: '⏱️' },
    get_user_location: { title: 'Checking location', emoji: '📍' },
    send_email: { title: 'Sending email', emoji: '📧' },
    useEmail: { title: 'Sending email', emoji: '📧' },
    spawn_agent: { title: 'Spawning agent', emoji: '🧬' },
    project_list_files: { title: 'Listing project files', emoji: '📂' },
    project_read_file: { title: 'Reading project file', emoji: '📄' },
    project_upsert_file: { title: 'Writing project file', emoji: '✏️' },
    project_delete_file: { title: 'Deleting project file', emoji: '🗑️' },
    project_create_branch: { title: 'Creating project branch', emoji: '🍴' },
    project_create_pull_request: { title: 'Creating pull request', emoji: '🔀' },
    // Add more tools here as needed
};

/**
 * Gets the chiplet information including text and agent data (for team tools).
 *
 * @param toolCall - Tool call to build chiplet info for.
 * @param locale - Optional BCP-47 locale string used to format time labels.
 * @param titleOverrides - Optional localized titles keyed by tool name.
 * @param chipTranslations - Optional localized chip templates for time-related tools.
 *
 * @private [🧠] Maybe public?
 */
export function getToolCallChipletInfo(
    toolCall: ToolCall,
    locale?: string,
    titleOverrides?: ToolCallTitleOverrides,
    chipTranslations?: ToolCallChipTranslations,
): ToolCallChipletInfo {
    const context = createToolCallChipletContext(toolCall, locale, titleOverrides, chipTranslations);

    return resolveSpecializedToolCallChipletInfo(context) || createDefaultToolCallChipletInfo(context);
}

/**
 * Collects the parsed values shared by all chiplet resolution steps.
 *
 * @param toolCall - Tool call being rendered.
 * @param locale - Optional locale used by time-sensitive helpers.
 * @param titleOverrides - Optional localized title overrides.
 * @param chipTranslations - Optional localized chip templates reused by specialized resolvers.
 * @returns Shared chiplet resolution context.
 *
 * @private utility of `<Chat/>`
 */
function createToolCallChipletContext(
    toolCall: ToolCall,
    locale?: string,
    titleOverrides?: ToolCallTitleOverrides,
    chipTranslations?: ToolCallChipTranslations,
): ToolCallChipletContext {
    const args = parseToolCallArguments(toolCall);
    const resultRaw = parseToolCallResult(toolCall.result);

    return {
        toolCall,
        locale,
        chipTranslations,
        args,
        resultRaw,
        baseTitle: resolveToolCallBaseTitle(toolCall.name, titleOverrides),
        emoji: resolveToolCallEmoji(toolCall.name),
        timeoutPresentation: resolveToolCallChipletTimeoutPresentation(toolCall.name, args, resultRaw, locale),
    };
}

/**
 * Resolves the first specialized chiplet branch that matches the tool call.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Specialized chiplet info when any resolver matches, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveSpecializedToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    for (const resolveToolCallChipletInfo of SPECIALIZED_TOOL_CALL_CHIPLET_RESOLVERS) {
        const chipletInfo = resolveToolCallChipletInfo(context);

        if (chipletInfo) {
            return chipletInfo;
        }
    }

    return null;
}

/**
 * Resolves the human-friendly fallback title for one tool call.
 *
 * @param toolName - Raw tool name.
 * @param titleOverrides - Optional localized title overrides.
 * @returns Title used when no specialized chip label applies.
 *
 * @private utility of `<Chat/>`
 */
function resolveToolCallBaseTitle(toolName: string, titleOverrides?: ToolCallTitleOverrides): string {
    return titleOverrides?.[toolName] || TOOL_TITLES[toolName]?.title || toolName;
}

/**
 * Resolves the emoji prefix used by standard tool chips.
 *
 * @param toolName - Raw tool name.
 * @returns Emoji shown at the beginning of the chip.
 *
 * @private utility of `<Chat/>`
 */
function resolveToolCallEmoji(toolName: string): string {
    return TOOL_TITLES[toolName]?.emoji || '🛠️';
}

/**
 * Resolves timeout presentation metadata only for timeout-aware tools.
 *
 * @param toolName - Raw tool name.
 * @param args - Parsed tool arguments.
 * @param resultRaw - Parsed tool result payload.
 * @param locale - Optional locale used for friendly date formatting.
 * @returns Timeout presentation metadata or `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveToolCallChipletTimeoutPresentation(
    toolName: string,
    args: Record<string, unknown>,
    resultRaw: unknown,
    locale?: string,
): ReturnType<typeof resolveTimeoutToolCallPresentation> {
    if (!isTimeoutToolCallName(toolName)) {
        return null;
    }

    return resolveTimeoutToolCallPresentation({
        toolCallName: toolName,
        args,
        resultRaw,
        currentDate: new Date(),
        locale,
    });
}

/**
 * Resolves a chip label for synthetic wallet-credential tool calls.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when the tool result represents wallet credentials, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveWalletCredentialChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    const walletCredentialResult = parseWalletCredentialToolCallResult(context.resultRaw);
    if (!walletCredentialResult) {
        return null;
    }

    return createEmojiToolCallChipletInfo(context, walletCredentialResult.credentialName);
}

/**
 * Resolves a chip label and agent metadata for TEAM tool calls.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when the result contains teammate metadata, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveTeamToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    const teamResult = parseTeamToolResult(context.resultRaw);
    if (!teamResult?.teammate) {
        return null;
    }

    const label = teamResult.teammate.label || teamResult.teammate.url || context.baseTitle;
    const agentData: AgentChipData = {
        url: teamResult.teammate.url as string,
        label,
    };

    return {
        text: label,
        agentData,
    };
}

/**
 * Resolves the specialized time chip label when the tool returns a valid date.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when a time label can be built, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveTimeToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    if (!isTimeToolCallName(context.toolCall.name)) {
        return null;
    }

    const resultDate = getToolCallResultDate(context.resultRaw);
    if (!resultDate) {
        return null;
    }

    return createEmojiToolCallChipletInfo(
        context,
        formatToolCallTranslationTemplate(context.chipTranslations?.toolCallTimeChipLabel || '{time}', {
            time: formatToolCallLocalTime(resultDate, context.locale),
        }),
    );
}

/**
 * Resolves the email-subject chip label when a subject is present.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when the email subject can be shown, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveEmailToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    if (!isEmailToolCallName(context.toolCall.name) || typeof context.args.subject !== 'string') {
        return null;
    }

    return createEmojiToolCallChipletInfo(context, context.args.subject);
}

/**
 * Resolves the memory-preview chip label for MEMORY tools.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when a memory preview is available, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveMemoryToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    if (!isMemoryToolCallName(context.toolCall.name)) {
        return null;
    }

    const memoryPreview = getMemoryPreviewText(context.args, context.resultRaw);
    if (!memoryPreview) {
        return null;
    }

    return createEmojiToolCallChipletInfo(context, memoryPreview);
}

/**
 * Resolves the timeout-specific chip label when timeout presentation metadata is available.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when the tool is a timeout tool, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveTimeoutToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    if (!context.timeoutPresentation) {
        return null;
    }

    return createEmojiToolCallChipletInfo(
        context,
        buildTimeoutToolCallChipLabel(context.timeoutPresentation, context.chipTranslations),
    );
}

/**
 * Resolves a query-based chip label used by search-like tools.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when a query string is present, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveQueryToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    if (typeof context.args.query !== 'string') {
        return null;
    }

    return createEmojiToolCallChipletInfo(context, context.args.query);
}

/**
 * Resolves a URL-based chip label by preferring the hostname over the raw URL.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Chiplet info when a URL string is present, otherwise `null`.
 *
 * @private utility of `<Chat/>`
 */
function resolveUrlToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo | null {
    if (typeof context.args.url !== 'string') {
        return null;
    }

    return createEmojiToolCallChipletInfo(context, resolveUrlChipLabel(context.args.url));
}

/**
 * Builds the final fallback chip label when no specialized branch matches.
 *
 * @param context - Shared chiplet resolution context.
 * @returns Fallback chiplet info.
 *
 * @private utility of `<Chat/>`
 */
function createDefaultToolCallChipletInfo(context: ToolCallChipletContext): ToolCallChipletInfo {
    return createEmojiToolCallChipletInfo(context, context.baseTitle);
}

/**
 * Builds a standard emoji-prefixed chip info object.
 *
 * @param context - Shared chiplet resolution context.
 * @param label - User-facing chip label without emoji prefix.
 * @returns Emoji-prefixed chiplet info.
 *
 * @private utility of `<Chat/>`
 */
function createEmojiToolCallChipletInfo(context: ToolCallChipletContext, label: string): ToolCallChipletInfo {
    return {
        text: `${context.emoji} ${label}`,
    };
}

/**
 * Resolves a friendly URL chip label, preferring the hostname over the raw input.
 *
 * @param rawUrl - Raw URL argument value.
 * @returns Hostname when URL parsing succeeds, otherwise the original string.
 *
 * @private utility of `<Chat/>`
 */
function resolveUrlChipLabel(rawUrl: string): string {
    try {
        return new URL(rawUrl).hostname;
    } catch {
        return rawUrl;
    }
}

/**
 * Checks whether a tool name belongs to the time commitment.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the chip should show a localized time label.
 *
 * @private utility of `<Chat/>`
 */
function isTimeToolCallName(toolName: string): boolean {
    return TIME_TOOL_CALL_NAMES.has(toolName);
}

/**
 * Checks whether a tool name belongs to the email commitment.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the chip may show an email subject.
 *
 * @private utility of `<Chat/>`
 */
function isEmailToolCallName(toolName: string): boolean {
    return EMAIL_TOOL_CALL_NAMES.has(toolName);
}

/**
 * Checks whether a tool name belongs to the memory commitment.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the chip may show a memory preview.
 *
 * @private utility of `<Chat/>`
 */
function isMemoryToolCallName(toolName: string): boolean {
    return MEMORY_TOOL_CALL_NAMES.has(toolName);
}

/**
 * Builds memory preview text for MEMORY commitment tool calls.
 *
 * @private utility of `<Chat/>`
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
 *
 * @private utility of `<Chat/>`
 */
function shortenMemoryPreview(content: string): string {
    const trimmed = content.trim().replace(/\s+/g, ' ');

    if (trimmed.length <= MEMORY_CHIP_MAX_LENGTH) {
        return trimmed;
    }

    return `${trimmed.slice(0, MEMORY_CHIP_TRUNCATE_LENGTH)}...`;
}
