import type {
    AgentMessageTouchedExternalSource,
    AgentMessageTouchedExternalSourceKind,
} from '../../../utils/agent-message-runtime/AgentMessageTouchedExternalSource';
import { normalizeAgentMessageTouchedExternalSource } from '../../../utils/agent-message-runtime/AgentMessageTouchedExternalSource';

/**
 * Synthetic tool name used for external-source chips in chat UI.
 *
 * The Agents Server emits one such tool call per source outside the agent an answer viewed or
 * edited, so the chat shows which services, websites and searches the agent really reached below
 * the message that touched them. Work the agent does inside itself emits nothing.
 *
 * @private internal chat-ui marker for touched external sources
 */
export const EXTERNAL_SOURCE_TOOL_CALL_NAME = 'external_source_touched';

/**
 * Emoji shown in the chip of each external source category.
 *
 * @private internal chat-ui constant for touched external sources
 */
const EXTERNAL_SOURCE_EMOJI_BY_KIND: Readonly<Record<AgentMessageTouchedExternalSourceKind, string>> = {
    integration: '🔌',
    website: '🌐',
    search: '🔎',
};

/**
 * Parses the external-source chip payload from one tool result.
 *
 * @param result - Raw tool result payload.
 * @returns Parsed source metadata, or `null` when the result describes no external source.
 *
 * @private internal helper reused by chip and modal rendering
 */
export function parseExternalSourceToolCallResult(result: unknown): AgentMessageTouchedExternalSource | null {
    return normalizeAgentMessageTouchedExternalSource(result);
}

/**
 * Resolves the chip label of one touched external source.
 *
 * @param externalSource - Parsed source metadata.
 * @returns User-facing name of the source.
 *
 * @private internal helper reused by chip and modal rendering
 */
export function resolveExternalSourceToolCallLabel(externalSource: AgentMessageTouchedExternalSource): string {
    return externalSource.name;
}

/**
 * Resolves the chip emoji of one touched external source.
 *
 * @param externalSource - Parsed source metadata.
 * @returns Emoji telling apart an integration, a website and a search.
 *
 * @private internal helper reused by chip and modal rendering
 */
export function resolveExternalSourceToolCallEmoji(externalSource: AgentMessageTouchedExternalSource): string {
    return EXTERNAL_SOURCE_EMOJI_BY_KIND[externalSource.kind];
}

// Note: [💞] Ignore a discrepancy between file name and entity name
