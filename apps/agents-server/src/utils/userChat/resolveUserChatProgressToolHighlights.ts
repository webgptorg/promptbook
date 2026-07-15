import type { LlmToolDefinition } from '@promptbook-local/types';

/**
 * Maximum number of tool highlight labels surfaced in the progress card text.
 *
 * Keeps the rendered sentence readable when an agent exposes many tools.
 */
const MAX_TOOL_HIGHLIGHTS = 4;

/**
 * Maps technical tool identifiers to short user-facing labels shown in the
 * durable chat progress card while capabilities are being checked.
 */
const USER_CHAT_PROGRESS_TOOL_LABEL_BY_NAME: Record<string, string> = {
    web_search: 'web search',
    deep_search: 'deep research',
    useSearchEngine: 'web search',
    search: 'web search',
    useBrowser: 'web browser',
    browse: 'web browser',
    fetch_url_content: 'web browser',
    run_browser: 'web browser',
    get_current_time: 'time awareness',
    useTime: 'time awareness',
    set_timeout: 'timers',
    cancel_timeout: 'timers',
    list_timeouts: 'timers',
    update_timeout: 'timers',
    get_user_location: 'user location',
    send_email: 'email sending',
    useEmail: 'email sending',
    spawn_agent: 'teammate agents',
    retrieve_user_memory: 'long-term memory',
    store_user_memory: 'long-term memory',
    project_list_files: 'project files',
    project_read_file: 'project files',
    project_upsert_file: 'project files',
    project_delete_file: 'project files',
    project_create_branch: 'project repository',
    project_create_pull_request: 'project repository',
};

/**
 * Tool identifiers that should never appear as user-facing capability highlights.
 *
 * `agent_progress` is an internal runtime tool used by the worker to update this
 * very progress card, and `assistant_preparation` is the engine-level chip shown
 * while the model is being prepared. Neither describes a user-relevant capability.
 */
const HIDDEN_PROGRESS_TOOL_NAMES: ReadonlySet<string> = new Set(['agent_progress', 'assistant_preparation']);

/**
 * Derives a short, deduplicated list of user-facing tool labels for one durable chat turn.
 *
 * @public exported for `createRunUserChatJobExecutionContext`
 */
export function resolveUserChatProgressToolHighlights(
    tools: ReadonlyArray<LlmToolDefinition>,
): ReadonlyArray<string> {
    const highlights: Array<string> = [];
    const seenLabels = new Set<string>();

    for (const tool of tools) {
        if (!tool || typeof tool.name !== 'string') {
            continue;
        }

        if (HIDDEN_PROGRESS_TOOL_NAMES.has(tool.name)) {
            continue;
        }

        const label = USER_CHAT_PROGRESS_TOOL_LABEL_BY_NAME[tool.name] ?? humanizeToolName(tool.name);
        if (!label || seenLabels.has(label)) {
            continue;
        }

        seenLabels.add(label);
        highlights.push(label);

        if (highlights.length >= MAX_TOOL_HIGHLIGHTS) {
            break;
        }
    }

    return highlights;
}

/**
 * Converts a technical tool identifier into a short readable label as a fallback.
 *
 * @private internal helper of `resolveUserChatProgressToolHighlights`
 */
function humanizeToolName(name: string): string {
    const normalized = name.replace(/[_-]+/g, ' ').trim().toLowerCase();
    if (!normalized) {
        return '';
    }

    return normalized;
}
