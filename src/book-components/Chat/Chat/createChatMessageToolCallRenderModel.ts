import type { ToolCall } from '../../../types/ToolCall';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../types/ToolCall';
import { resolveToolCallIdempotencyKey } from '../../../utils/toolCalls/resolveToolCallIdempotencyKey';
import type { AgentChipData } from '../AgentChip';
import type { ChatMessage } from '../types/ChatMessage';
import { collectTeamToolCallSummary, type TransitiveCitation, type TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import { isTeamToolName } from '../utils/createTeamToolNameFromUrl';
import { buildToolCallChipText, getToolCallChipletInfo, type ToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import { resolveToolCallState } from '../utils/resolveToolCallState';
import { createDeduplicatedWalletCredentialToolCalls } from '../utils/walletCredentialToolCall';
import type { ChatProps } from './ChatProps';

/**
 * Status variants for tool call chips.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ToolCallChipStatus = 'ongoing' | 'done' | 'error';

/**
 * Metadata rendered inside a single tool call chip.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ToolCallChipEntry = {
    /**
     * Stable key for React rendering.
     */
    key: string;
    /**
     * Tool call represented by this chip.
     */
    toolCall: ToolCall;
    /**
     * Chip label text.
     */
    label: string;
    /**
     * Current status of the tool call.
     */
    status: ToolCallChipStatus;
    /**
     * Optional agent metadata for TEAM or transitive tool calls.
     */
    teamAgentData: AgentChipData | null;
    /**
     * Marks entries built for transitive tool calls.
     */
    isTransitive: boolean;
};

/**
 * Precomputed tool-call UI data consumed by `<ChatMessageItem/>`.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ChatMessageToolCallRenderModel = {
    /**
     * Tool call chips rendered below the message body.
     */
    readonly toolCallChips: ReadonlyArray<ToolCallChipEntry>;
    /**
     * Citations surfaced from nested teammate responses.
     */
    readonly transitiveCitations: ReadonlyArray<TransitiveCitation>;
};

/**
 * Inputs used to derive the tool-call UI model for one chat message.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type CreateChatMessageToolCallRenderModelOptions = {
    readonly message: ChatMessage;
    readonly teammates?: ChatProps['teammates'];
    readonly teamAgentProfiles?: ChatProps['teamAgentProfiles'];
    readonly locale?: string;
    readonly toolTitles?: ChatProps['toolTitles'];
    readonly chatUiTranslations?: ChatProps['chatUiTranslations'];
};

/**
 * Builds the tool-call render model used by `<ChatMessageItem/>`.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function createChatMessageToolCallRenderModel(
    options: CreateChatMessageToolCallRenderModelOptions,
): ChatMessageToolCallRenderModel {
    const { message, teammates, teamAgentProfiles, locale, toolTitles, chatUiTranslations } = options;
    const isComplete = message.isComplete ?? true;
    const completedToolCalls = dedupeToolCalls(filterRenderableToolCalls(message.toolCalls || message.completedToolCalls));
    const teamToolCallSummary = collectTeamToolCallSummary(completedToolCalls);

    const toolCallChips = isComplete
        ? buildFinalToolCallChips(
              completedToolCalls,
              teamToolCallSummary.toolCalls,
              teammates,
              teamAgentProfiles,
              locale,
              toolTitles,
              chatUiTranslations,
          )
        : buildOngoingToolCallChips(
              message.ongoingToolCalls,
              teammates,
              teamAgentProfiles,
              locale,
              toolTitles,
              chatUiTranslations,
          );

    return {
        toolCallChips,
        transitiveCitations: teamToolCallSummary.citations,
    };
}

/**
 * Tool calls that should stay available in message data but never render as chips under the message.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const HIDDEN_TOOL_CALL_CHIP_NAMES = new Set([ASSISTANT_PREPARATION_TOOL_CALL_NAME, 'agent_progress']);

/**
 * Ongoing tool call entry used for grouping.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type OngoingToolCall = NonNullable<ChatMessage['ongoingToolCalls']>[number];

/**
 * Determines whether one tool call should render as a chip under the message.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function shouldRenderToolCallChip(toolCall: ToolCall): boolean {
    return !HIDDEN_TOOL_CALL_CHIP_NAMES.has(toolCall.name);
}

/**
 * Filters a tool-call list down to entries that should render as visible chips.
 *
 * @param toolCalls - Candidate tool calls.
 * @returns Renderable tool calls only.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function filterRenderableToolCalls<T extends ToolCall>(toolCalls: ReadonlyArray<T> | undefined): Array<T> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    return toolCalls.filter(shouldRenderToolCallChip);
}

/**
 * Finds teammate metadata by tool name, falling back to the toolName field when needed.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function findTeammateByToolName(
    teammates: ChatProps['teammates'] | undefined,
    toolName: string,
): NonNullable<ChatProps['teammates']>[string] | undefined {
    if (!teammates) {
        return undefined;
    }

    return teammates[toolName] || Object.values(teammates).find((teammate) => teammate.toolName === toolName);
}

/**
 * Resolves agent chip data for TEAM tool calls using tool results or teammate metadata.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function resolveTeamAgentChipData(
    toolCall: ToolCall,
    teammates: ChatProps['teammates'] | undefined,
    chipletInfo: ToolCallChipletInfo | undefined,
    teamAgentProfiles: ChatProps['teamAgentProfiles'] | undefined,
): AgentChipData | null {
    const resolvedChipletInfo = chipletInfo || getToolCallChipletInfo(toolCall);
    const baseAgentData = resolvedChipletInfo.agentData;
    const profileOverride = teamAgentProfiles?.[toolCall.name];

    if (profileOverride) {
        const fallbackUrl = profileOverride.url || baseAgentData?.url;
        if (!fallbackUrl) {
            return null;
        }

        return {
            url: fallbackUrl,
            label: profileOverride.label || baseAgentData?.label,
            imageUrl: profileOverride.imageUrl ?? baseAgentData?.imageUrl,
            publicUrl: profileOverride.publicUrl ?? baseAgentData?.publicUrl,
        };
    }

    if (baseAgentData) {
        return baseAgentData;
    }

    if (!isTeamToolName(toolCall.name)) {
        return null;
    }

    const teammate = findTeammateByToolName(teammates, toolCall.name);
    if (!teammate?.url) {
        return null;
    }

    return {
        url: teammate.url,
        label: teammate.label,
    };
}

/**
 * Builds a stable key used for rendering a tool call chip.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function buildToolCallChipKey(toolCall: ToolCall, options?: { originLabel?: string }): string {
    const baseKey = getToolCallSnapshotKey(toolCall);
    if (options?.originLabel) {
        return `${baseKey}::${options.originLabel}`;
    }

    return baseKey;
}

/**
 * Converts ongoing tool calls into chip entries consumed by the UI.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function buildOngoingToolCallChips(
    toolCalls: ReadonlyArray<OngoingToolCall> | undefined,
    teammates: ChatProps['teammates'] | undefined,
    teamAgentProfiles: ChatProps['teamAgentProfiles'] | undefined,
    locale?: string,
    toolTitles?: ChatProps['toolTitles'],
    chatUiTranslations?: ChatProps['chatUiTranslations'],
): Array<ToolCallChipEntry> {
    const renderableToolCalls = filterRenderableToolCalls(toolCalls);
    if (renderableToolCalls.length === 0) {
        return [];
    }

    const entries = new Map<string, ToolCallChipEntry>();
    for (const toolCall of renderableToolCalls) {
        const key = buildToolCallChipKey(toolCall);
        const chipletInfo = getToolCallChipletInfo(toolCall, locale, toolTitles, chatUiTranslations);
        const label = buildToolCallChipText(chipletInfo);
        const teamAgentData = resolveTeamAgentChipData(toolCall, teammates, chipletInfo, teamAgentProfiles);
        const toolCallState = resolveToolCallState(toolCall);

        entries.set(key, {
            key,
            toolCall,
            label,
            status: toolCallState === 'ERROR' ? 'error' : toolCallState === 'COMPLETE' ? 'done' : 'ongoing',
            teamAgentData,
            isTransitive: false,
        });
    }

    return Array.from(entries.values());
}

/**
 * Builds the final tool call chips that are shown when a message completes.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function buildFinalToolCallChips(
    completedToolCalls: ReadonlyArray<ToolCall> | undefined,
    transitiveToolCalls: ReadonlyArray<TransitiveToolCall>,
    teammates: ChatProps['teammates'] | undefined,
    teamAgentProfiles: ChatProps['teamAgentProfiles'] | undefined,
    locale?: string,
    toolTitles?: ChatProps['toolTitles'],
    chatUiTranslations?: ChatProps['chatUiTranslations'],
): Array<ToolCallChipEntry> {
    const entries: Array<ToolCallChipEntry> = [];

    if (completedToolCalls && completedToolCalls.length > 0) {
        for (const toolCall of completedToolCalls) {
            if (!shouldRenderToolCallChip(toolCall)) {
                continue;
            }

            const key = buildToolCallChipKey(toolCall);
            const chipletInfo = getToolCallChipletInfo(toolCall, locale, toolTitles, chatUiTranslations);
            const label = buildToolCallChipText(chipletInfo);
            const teamAgentData = resolveTeamAgentChipData(toolCall, teammates, chipletInfo, teamAgentProfiles);

            entries.push({
                key,
                toolCall,
                label,
                status: resolveToolCallState(toolCall) === 'ERROR' || hasToolCallErrors(toolCall) ? 'error' : 'done',
                teamAgentData,
                isTransitive: false,
            });
        }

        const walletCredentialToolCalls = createDeduplicatedWalletCredentialToolCalls(completedToolCalls);
        for (const walletCredentialToolCall of walletCredentialToolCalls) {
            const walletKey = buildToolCallChipKey(walletCredentialToolCall);
            const walletChipletInfo = getToolCallChipletInfo(
                walletCredentialToolCall,
                locale,
                toolTitles,
                chatUiTranslations,
            );

            entries.push({
                key: walletKey,
                toolCall: walletCredentialToolCall,
                label: buildToolCallChipText(walletChipletInfo),
                status: 'done',
                teamAgentData: null,
                isTransitive: false,
            });
        }
    }

    if (transitiveToolCalls && transitiveToolCalls.length > 0) {
        for (const transitive of transitiveToolCalls) {
            const key = buildToolCallChipKey(transitive.toolCall, { originLabel: transitive.origin.label });
            const chipletInfo = getToolCallChipletInfo(transitive.toolCall, locale, toolTitles, chatUiTranslations);
            const label = buildToolCallChipText(chipletInfo);
            const agentData: AgentChipData = {
                url: transitive.origin.url || 'about:blank',
                label: transitive.origin.label,
            };

            entries.push({
                key,
                toolCall: transitive.toolCall,
                label,
                status:
                    resolveToolCallState(transitive.toolCall) === 'ERROR' || hasToolCallErrors(transitive.toolCall)
                        ? 'error'
                        : 'done',
                teamAgentData: agentData,
                isTransitive: true,
            });
        }
    }

    return entries;
}

/**
 * Builds the stable key used to detect duplicate snapshots for a tool call.
 *
 * @private internal utility of `<ChatMessageItem/>`
 */
function getToolCallSnapshotKey(toolCall: ToolCall): string {
    const providedIdempotencyKey = typeof toolCall.idempotencyKey === 'string' ? toolCall.idempotencyKey.trim() : '';
    const normalizedKey = providedIdempotencyKey || resolveToolCallIdempotencyKey(toolCall);
    return `tool-snapshot:${normalizedKey}`;
}

/**
 * Deduplicates a list of tool calls by their idempotency key, keeping only the most recent
 * non-error snapshot for each invocation and dropping errored snapshots once a counterpart
 * with the same key succeeds.
 *
 * @private internal utility of `<ChatMessageItem/>`
 */
function dedupeToolCalls(toolCalls: ReadonlyArray<ToolCall> | undefined): Array<ToolCall> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    const seen = new Map<string, ToolCall>();
    for (const toolCall of toolCalls) {
        const key = getToolCallSnapshotKey(toolCall);
        const existing = seen.get(key);
        if (existing) {
            const existingHasErrors = hasToolCallErrors(existing);
            const incomingHasErrors = hasToolCallErrors(toolCall);
            if (!existingHasErrors && incomingHasErrors) {
                continue;
            }
            seen.delete(key);
        }

        seen.set(key, toolCall);
    }

    return Array.from(seen.values());
}

/**
 * Determines whether a tool call reported execution errors.
 *
 * @param toolCall - Tool call to inspect.
 * @returns `true` when the tool call contains at least one error entry.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function hasToolCallErrors(toolCall: ToolCall): boolean {
    return Array.isArray(toolCall.errors) && toolCall.errors.length > 0;
}
