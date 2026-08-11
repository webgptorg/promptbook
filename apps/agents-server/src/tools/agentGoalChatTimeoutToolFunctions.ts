import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../../../src/types/string_person_fullname';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import { createToolExecutionEnvelope } from '../../../../src/commitments/_common/toolExecutionEnvelope';
import { readToolRuntimeContextFromToolArgs } from '../../../../src/commitments/_common/toolRuntimeContext';
import { ParseError } from '../../../../src/errors/ParseError';
import {
    createAgentGoalChatPlannedMessageActions,
    type AgentGoalChatPlannedMessageDependencies,
    type AgentGoalChatPlannedMessageItem,
} from '../utils/agentGoalChat/agentGoalChatPlannedMessageActions';
import { AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES } from './agentGoalChatTimeoutTools';

/**
 * Maximum number of planned messages repeated in the assistant-visible list summary.
 */
const MAX_ASSISTANT_VISIBLE_PLANNED_MESSAGES = 20;

/**
 * Raw model-supplied arguments accepted by planned-message tools.
 */
type AgentGoalChatTimeoutToolArguments = Record<string, unknown>;

/**
 * Creates tool functions that schedule and manage future messages in an agent's singleton goal chat.
 *
 * @param dependencyOverrides - Optional persistence substitutions used by focused tests.
 * @returns Script-callable planned-message functions keyed by their model-facing names.
 */
export function createAgentGoalChatTimeoutToolFunctions(
    dependencyOverrides: Partial<AgentGoalChatPlannedMessageDependencies> = {},
): Record<string_javascript_name, ToolFunction> {
    const actions = createAgentGoalChatPlannedMessageActions(dependencyOverrides);

    return {
        async [AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.set](
            toolArguments: AgentGoalChatTimeoutToolArguments,
        ): Promise<string> {
            try {
                const agentPermanentId = resolveAgentPermanentId(toolArguments);
                const result = await actions.set({
                    agentPermanentId,
                    milliseconds: toolArguments.milliseconds,
                    message: toolArguments.message,
                });

                return createToolExecutionEnvelope({
                    assistantMessage: `Planned message ${JSON.stringify(result.timeoutId)} for ${result.dueAt}.`,
                    toolResult: result,
                });
            } catch (error) {
                return serializeToolError('set', error);
            }
        },

        async [AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.list](
            toolArguments: AgentGoalChatTimeoutToolArguments,
        ): Promise<string> {
            try {
                const agentPermanentId = resolveAgentPermanentId(toolArguments);
                const result = await actions.list({
                    agentPermanentId,
                    isIncludingFinished: toolArguments.isIncludingFinished,
                    limit: toolArguments.limit,
                });

                return createToolExecutionEnvelope({
                    assistantMessage: createPlannedMessagesAssistantSummary(result.items),
                    toolResult: result,
                });
            } catch (error) {
                return serializeToolError('list', error);
            }
        },

        async [AGENT_GOAL_CHAT_TIMEOUT_TOOL_NAMES.cancel](
            toolArguments: AgentGoalChatTimeoutToolArguments,
        ): Promise<string> {
            try {
                const agentPermanentId = resolveAgentPermanentId(toolArguments);
                const result = await actions.cancel({
                    agentPermanentId,
                    timeoutId: toolArguments.timeoutId,
                });

                return createToolExecutionEnvelope({
                    assistantMessage:
                        result.status === 'cancelled'
                            ? `Cancelled planned message ${JSON.stringify(result.timeoutId)}.`
                            : 'The planned message was already inactive or was not found.',
                    toolResult: result,
                });
            } catch (error) {
                return serializeToolError('cancel', error);
            }
        },
    };
}

/**
 * Production planned-message functions registered in the Agents Server script runtime.
 */
export const AGENT_GOAL_CHAT_TIMEOUT_TOOL_FUNCTIONS = createAgentGoalChatTimeoutToolFunctions();

/**
 * Resolves the active agent identity from hidden server runtime context.
 *
 * @param toolArguments - Raw tool arguments containing the hidden runtime payload.
 * @returns Permanent id of the agent that owns the singleton goal chat.
 */
function resolveAgentPermanentId(toolArguments: AgentGoalChatTimeoutToolArguments): string {
    const runtimeContext = readToolRuntimeContextFromToolArgs(toolArguments);
    const candidateAgentIds = [
        runtimeContext?.chat?.agentId,
        runtimeContext?.memory?.agentId,
        runtimeContext?.spawn?.parentAgentId,
    ];

    for (const candidateAgentId of candidateAgentIds) {
        if (typeof candidateAgentId === 'string' && candidateAgentId.trim().length > 0) {
            return candidateAgentId.trim();
        }
    }

    throw new ParseError(
        spaceTrim(`
            Planned messages are unavailable because the active agent identity is missing.

            **Note:** This tool can only run inside an Agents Server agent invocation.
        `),
    );
}

/**
 * Builds concise text shown to the model for a planned-message listing.
 *
 * @param plannedMessages - Ordered planned-message summaries returned by the shared action.
 * @returns Assistant-visible listing summary.
 */
function createPlannedMessagesAssistantSummary(
    plannedMessages: ReadonlyArray<AgentGoalChatPlannedMessageItem>,
): string {
    if (plannedMessages.length === 0) {
        return 'There are no matching planned messages.';
    }

    const visiblePlannedMessages = plannedMessages.slice(0, MAX_ASSISTANT_VISIBLE_PLANNED_MESSAGES);
    const summaryRows = visiblePlannedMessages.map((plannedMessage, index) => {
        const message = plannedMessage.message?.trim() || 'Wake up and continue working towards the current goal.';
        return `${index + 1}. ${plannedMessage.timeoutId} at ${plannedMessage.dueAt}: ${message}`;
    });
    const hiddenPlannedMessageCount = plannedMessages.length - visiblePlannedMessages.length;

    if (hiddenPlannedMessageCount > 0) {
        summaryRows.push(`...and ${hiddenPlannedMessageCount} more.`);
    }

    return spaceTrim(
        (block) => `
            Found ${plannedMessages.length} planned message${plannedMessages.length === 1 ? '' : 's'}:

            ${block(summaryRows.join('\n'))}
        `,
    );
}

/**
 * Serializes one caught tool failure without crashing the surrounding model run.
 *
 * @param action - Planned-message action that failed.
 * @param error - Caught failure.
 * @returns JSON result readable by the model and persisted tool-call inspector.
 */
function serializeToolError(action: 'set' | 'list' | 'cancel', error: unknown): string {
    return JSON.stringify({
        action,
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
    });
}
