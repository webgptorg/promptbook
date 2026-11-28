import { capitalize } from '../normalization/capitalize';
import type { AgentMessageTouchedExternalSource } from './AgentMessageTouchedExternalSource';
import type {
    AgentMessageRuntimeLogContentBlock,
    AgentMessageRuntimeLogEvent,
} from './parseAgentMessageRuntimeLogEvents';
import { parseAgentMessageRuntimeLogEvents } from './parseAgentMessageRuntimeLogEvents';

/**
 * Maximum count of external sources reported for one answered message.
 *
 * A single answer can reach the same kind of source many times, so the chip row below it stays
 * readable by keeping only the sources touched first.
 *
 * @private internal constant of agent-message touched external sources
 */
const MAX_TOUCHED_EXTERNAL_SOURCES = 12;

/**
 * Maximum length of one search query shown as the name of a touched search source.
 *
 * @private internal constant of agent-message touched external sources
 */
const MAX_SEARCH_QUERY_LENGTH = 48;

/**
 * Separator between the segments of one integration tool name, as in `mcp__gmail__create_draft`.
 *
 * @private internal constant of agent-message touched external sources
 */
const INTEGRATION_TOOL_NAME_SEPARATOR = '__';

/**
 * First segment marking one tool name as belonging to an integration.
 *
 * @private internal constant of agent-message touched external sources
 */
const INTEGRATION_TOOL_NAME_PREFIX = 'mcp';

/**
 * Names of the harness tools which look something up on the web, indexed for case-insensitive matching.
 *
 * @private internal constant of agent-message touched external sources
 */
const WEB_SEARCH_TOOL_NAMES: ReadonlySet<string> = new Set(
    ['WebSearch', 'web_search'].map((webSearchToolName) => webSearchToolName.toLowerCase()),
);

/**
 * Matches one shell command invoking a network client, whose arguments therefore address the outside world.
 *
 * @private internal constant of agent-message touched external sources
 */
const NETWORK_CLIENT_COMMAND_REGEX = /(^|[\s|;&(])(curl|wget|invoke-webrequest|iwr)\b/iu;

/**
 * Matches one web address inside a shell command.
 *
 * @private internal constant of agent-message touched external sources
 */
const COMMAND_URL_REGEX = /https?:\/\/[^\s"'`<>)\]]+/giu;

/**
 * Separators used between the words of one integration name.
 *
 * @private internal constant of agent-message touched external sources
 */
const INTEGRATION_NAME_WORD_SEPARATOR_REGEX = /[-_.\s]+/gu;

/**
 * Hostnames which address the machine the agent runs on and are therefore not external.
 *
 * @private internal constant of agent-message touched external sources
 */
const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

/**
 * Resolves which sources outside the agent one coding harness touched while answering a single message.
 *
 * The runtime log streams what the harness really did, so a source counts as touched when the
 * harness reached it in a tool invocation — calling an integration, fetching a web address,
 * searching the web, or running a network client in the shell. Only tool payloads are inspected:
 * tool results and assistant narration are ignored so a service merely mentioned in the
 * conversation is never reported, and addresses of the machine the agent runs on are dropped
 * because they are internal.
 *
 * @param options - Raw runtime log content of one answered message.
 * @returns Touched external sources without duplicates, ordered by first appearance.
 * @private internal utility of the agent-message runtime
 */
export function resolveAgentMessageTouchedExternalSources(options: {
    readonly logText: string | null | undefined;
}): ReadonlyArray<AgentMessageTouchedExternalSource> {
    const touchedExternalSources = new Map<string, AgentMessageTouchedExternalSource>();

    for (const event of parseAgentMessageRuntimeLogEvents(options.logText)) {
        for (const externalSource of resolveRuntimeLogEventExternalSources(event)) {
            const externalSourceKey = createExternalSourceKey(externalSource);

            if (!touchedExternalSources.has(externalSourceKey)) {
                touchedExternalSources.set(externalSourceKey, externalSource);
            }

            if (touchedExternalSources.size === MAX_TOUCHED_EXTERNAL_SOURCES) {
                return Array.from(touchedExternalSources.values());
            }
        }
    }

    return Array.from(touchedExternalSources.values());
}

/**
 * Collects every external source described by one runtime log event.
 *
 * Claude Code reports tool invocations as `tool_use` content blocks, while Codex reports executed
 * commands, web searches, and integration calls as items.
 *
 * @param event - One structured runtime log event.
 * @returns External sources the event reached, possibly with duplicates.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function resolveRuntimeLogEventExternalSources(
    event: AgentMessageRuntimeLogEvent,
): ReadonlyArray<AgentMessageTouchedExternalSource> {
    const externalSources: Array<AgentMessageTouchedExternalSource> = [];

    for (const contentBlock of event.message?.content || []) {
        if (contentBlock.type === 'tool_use') {
            externalSources.push(...resolveToolUseExternalSources(contentBlock));
        }
    }

    externalSources.push(...resolveCodexItemExternalSources(event.item));

    return externalSources;
}

/**
 * Collects the external sources reached by one Claude Code tool invocation.
 *
 * @param contentBlock - One `tool_use` content block.
 * @returns External sources the invocation reached.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function resolveToolUseExternalSources(
    contentBlock: AgentMessageRuntimeLogContentBlock,
): ReadonlyArray<AgentMessageTouchedExternalSource> {
    const toolName = contentBlock.name || '';
    const toolInput = contentBlock.input || {};

    return collectDefinedExternalSources([
        createIntegrationExternalSource(resolveIntegrationName(toolName)),
        typeof toolInput.url === 'string' ? createWebsiteExternalSource(toolInput.url) : null,
        WEB_SEARCH_TOOL_NAMES.has(toolName.toLowerCase()) && typeof toolInput.query === 'string'
            ? createSearchExternalSource(toolInput.query)
            : null,
        ...(typeof toolInput.command === 'string' ? resolveNetworkCommandExternalSources(toolInput.command) : []),
    ]);
}

/**
 * Collects the external sources reached by one Codex runtime item.
 *
 * @param item - One Codex item of a runtime log event.
 * @returns External sources the item reached.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function resolveCodexItemExternalSources(
    item: AgentMessageRuntimeLogEvent['item'],
): ReadonlyArray<AgentMessageTouchedExternalSource> {
    if (!item) {
        return [];
    }

    return collectDefinedExternalSources([
        item.type === 'mcp_tool_call'
            ? createIntegrationExternalSource(item.server || resolveIntegrationName(item.tool || ''))
            : null,
        item.type === 'web_search' && typeof item.query === 'string' ? createSearchExternalSource(item.query) : null,
        ...(typeof item.command === 'string' ? resolveNetworkCommandExternalSources(item.command) : []),
    ]);
}

/**
 * Drops the candidates which turned out not to describe an external source.
 *
 * @param candidates - Resolved sources mixed with the candidates that resolved to nothing.
 * @returns Only the sources which were resolved.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function collectDefinedExternalSources(
    candidates: ReadonlyArray<AgentMessageTouchedExternalSource | null>,
): ReadonlyArray<AgentMessageTouchedExternalSource> {
    return candidates.filter((candidate): candidate is AgentMessageTouchedExternalSource => candidate !== null);
}

/**
 * Resolves the integration a tool name belongs to, following the `mcp__<integration>__<tool>` convention.
 *
 * @param toolName - Raw harness tool name.
 * @returns Raw integration name, or `null` when the tool belongs to no integration.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function resolveIntegrationName(toolName: string): string | null {
    const toolNameSegments = toolName.split(INTEGRATION_TOOL_NAME_SEPARATOR);

    if (toolNameSegments.length < 3 || toolNameSegments[0]!.toLowerCase() !== INTEGRATION_TOOL_NAME_PREFIX) {
        return null;
    }

    return toolNameSegments[1] || null;
}

/**
 * Creates one touched integration source.
 *
 * @param integrationName - Raw integration name, or `null` when there is none.
 * @returns Touched source, or `null` when the integration cannot be named.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function createIntegrationExternalSource(integrationName: string | null): AgentMessageTouchedExternalSource | null {
    const humanizedIntegrationName = humanizeIntegrationName(integrationName || '');

    if (humanizedIntegrationName === '') {
        return null;
    }

    return { kind: 'integration', name: humanizedIntegrationName };
}

/**
 * Creates one touched website source.
 *
 * @param rawUrl - Raw web address the harness reached.
 * @returns Touched source, or `null` when the address is unusable or addresses the local machine.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function createWebsiteExternalSource(rawUrl: string): AgentMessageTouchedExternalSource | null {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        return null;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname === '' || LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
        return null;
    }

    return { kind: 'website', name: hostname, url: url.href };
}

/**
 * Creates one touched web search source.
 *
 * @param query - Raw query the harness looked up.
 * @returns Touched source, or `null` when the query is empty.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function createSearchExternalSource(query: string): AgentMessageTouchedExternalSource | null {
    const normalizedQuery = query.replace(/\s+/gu, ' ').trim();

    if (normalizedQuery === '') {
        return null;
    }

    return {
        kind: 'search',
        name:
            normalizedQuery.length <= MAX_SEARCH_QUERY_LENGTH
                ? normalizedQuery
                : `${normalizedQuery.slice(0, MAX_SEARCH_QUERY_LENGTH).trimEnd()}…`,
    };
}

/**
 * Collects the websites addressed by one shell command running a network client.
 *
 * Commands which do not invoke a network client are ignored, so a web address that merely appears
 * in the text the agent writes into a file is never reported as touched.
 *
 * @param command - One executed shell command.
 * @returns Touched website sources of the command.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function resolveNetworkCommandExternalSources(command: string): ReadonlyArray<AgentMessageTouchedExternalSource> {
    if (!NETWORK_CLIENT_COMMAND_REGEX.test(command)) {
        return [];
    }

    const commandUrlRegex = new RegExp(COMMAND_URL_REGEX.source, COMMAND_URL_REGEX.flags);
    const externalSources: Array<AgentMessageTouchedExternalSource> = [];
    let commandUrlMatch = commandUrlRegex.exec(command);

    while (commandUrlMatch !== null) {
        const externalSource = createWebsiteExternalSource(commandUrlMatch[0]);

        if (externalSource) {
            externalSources.push(externalSource);
        }

        commandUrlMatch = commandUrlRegex.exec(command);
    }

    return externalSources;
}

/**
 * Converts one raw integration name into its user-facing form.
 *
 * For example `google-calendar` becomes `Google Calendar`.
 *
 * @param integrationName - Raw integration name.
 * @returns Human-readable integration name, or an empty string when there is nothing to show.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function humanizeIntegrationName(integrationName: string): string {
    return integrationName
        .trim()
        .split(INTEGRATION_NAME_WORD_SEPARATOR_REGEX)
        .filter((integrationNameWord) => integrationNameWord !== '')
        .map((integrationNameWord) => capitalize(integrationNameWord))
        .join(' ');
}

/**
 * Builds the key identifying one external source across the whole run.
 *
 * @param externalSource - One touched external source.
 * @returns Key under which repeated touches of the same source collapse into one.
 * @private internal helper of `resolveAgentMessageTouchedExternalSources`
 */
function createExternalSourceKey(externalSource: AgentMessageTouchedExternalSource): string {
    return `${externalSource.kind}:${externalSource.name.toLowerCase()}`;
}
