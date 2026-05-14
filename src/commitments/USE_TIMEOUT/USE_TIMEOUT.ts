import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_javascript_name } from '../../types/string_person_fullname';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { createTimeoutSystemMessage } from './createTimeoutSystemMessage';
import { createTimeoutToolFunctions } from './createTimeoutToolFunctions';
import { createTimeoutTools } from './createTimeoutTools';
import { TimeoutToolNames } from './TimeoutToolNames';

export { setTimeoutToolRuntimeAdapter } from './setTimeoutToolRuntimeAdapter';
export type {
    CancelTimeoutToolResult,
    ListTimeoutsToolResult,
    SetTimeoutToolResult,
    TimeoutToolListItem,
    TimeoutToolRuntimeAdapter,
    TimeoutToolRuntimeContext,
    UpdateTimeoutToolResult,
} from './TimeoutToolRuntimeAdapter';

/**
 * `USE TIMEOUT` commitment definition.
 *
 * The `USE TIMEOUT` commitment enables timeout wake-ups and scoped timeout management.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseTimeoutCommitmentDefinition extends BaseCommitmentDefinition<'USE TIMEOUT'> {
    public constructor() {
        super('USE TIMEOUT');
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of `USE TIMEOUT`.
     */
    get description(): string {
        return 'Enable timeout wake-ups plus scoped timeout listing, updates, and cancellation across chats.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '⏱️';
    }

    /**
     * Markdown documentation for `USE TIMEOUT`.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE TIMEOUT

            Enables timeout wake-ups and timeout management for the same user+agent scope.

            ## Key aspects

            - The agent uses \`set_timeout\` to schedule a future wake-up in the same chat thread.
            - The tool returns immediately while the timeout is stored and executed by the runtime later.
            - The wake-up arrives as a new user-like timeout message in the same conversation.
            - The agent can inspect known timeout details via \`list_timeouts\`.
            - The agent can cancel one timeout by \`timeoutId\` or cancel all active timeouts via \`cancel_timeout\`.
            - The agent can pause/resume and edit timeout details via \`update_timeout\`.
            - Commitment content is treated as optional timeout policy instructions.

            ## Examples

            \`\`\`book
            Follow-up Agent
            USE TIMEOUT Remind yourself only when follow-up work is explicitly requested.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Timeout instructions', content);

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: createTimeoutTools(requirements.tools || []),
                _metadata: {
                    ...requirements._metadata,
                    useTimeout: content || true,
                },
            },
            createTimeoutSystemMessage(extraInstructions),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [TimeoutToolNames.set]: 'Set timer',
            [TimeoutToolNames.cancel]: 'Cancel timer',
            [TimeoutToolNames.list]: 'List timers',
            [TimeoutToolNames.update]: 'Update timer',
        };
    }

    /**
     * Gets `USE TIMEOUT` tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createTimeoutToolFunctions();
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
