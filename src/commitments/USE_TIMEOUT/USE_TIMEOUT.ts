import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { createTimeoutSystemMessage } from './createTimeoutSystemMessage';
import { createTimeoutToolFunctions } from './createTimeoutToolFunctions';
import { createTimeoutTools } from './createTimeoutTools';
import { TimeoutToolNames } from './TimeoutToolNames';

export { setTimeoutToolRuntimeAdapter } from './setTimeoutToolRuntimeAdapter';
export type {
    CancelTimeoutToolResult,
    SetTimeoutToolResult,
    TimeoutToolRuntimeAdapter,
    TimeoutToolRuntimeContext,
} from './TimeoutToolRuntimeAdapter';

/**
 * `USE TIMEOUT` commitment definition.
 *
 * The `USE TIMEOUT` commitment enables thread-scoped timers that wake the same chat later.
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
        return 'Enable thread-scoped timers that can wake the same chat in the future.';
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

            Enables the agent to schedule thread-scoped timeout wake-ups.

            ## Key aspects

            - The agent uses \`set_timeout\` to schedule a future wake-up in the same chat thread.
            - The tool returns immediately while the timeout is stored and executed by the runtime later.
            - The wake-up arrives as a new user-like timeout message in the same conversation.
            - The agent can cancel an existing timeout by \`timeoutId\` via \`cancel_timeout\`.
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
        };
    }

    /**
     * Gets `USE TIMEOUT` tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createTimeoutToolFunctions();
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
