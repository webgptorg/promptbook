import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { createMemorySystemMessage } from './createMemorySystemMessage';
import { createMemoryToolFunctions } from './createMemoryToolFunctions';
import { createMemoryTools } from './createMemoryTools';
import { getMemoryCommitmentDocumentation } from './getMemoryCommitmentDocumentation';
import { getMemoryToolTitles } from './getMemoryToolTitles';

export { setMemoryToolRuntimeAdapter } from './setMemoryToolRuntimeAdapter';
export type { MemoryToolRecord, MemoryToolRuntimeAdapter, MemoryToolRuntimeContext } from './MemoryToolRuntimeAdapter';

/**
 * MEMORY commitment definition
 *
 * The MEMORY commitment is similar to KNOWLEDGE but has a focus on remembering past
 * interactions and user preferences. It helps the agent maintain context about the
 * user's history, preferences, and previous conversations.
 *
 * Example usage in agent source:
 *
 * ```book
 * MEMORY User prefers detailed technical explanations
 * MEMORY Previously worked on React projects
 * MEMORY Timezone: UTC-5 (Eastern Time)
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MemoryCommitmentDefinition extends BaseCommitmentDefinition<'MEMORY' | 'MEMORIES'> {
    public constructor(type: 'MEMORY' | 'MEMORIES' = 'MEMORY') {
        super(type);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of MEMORY.
     */
    get description(): string {
        return 'Remember past interactions and user **preferences** for personalized responses.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧠';
    }

    /**
     * Markdown documentation for MEMORY commitment.
     */
    get documentation(): string {
        return getMemoryCommitmentDocumentation(this.type);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Memory instructions', content);
        const tools = createMemoryTools(requirements.tools);

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools,
                _metadata: {
                    ...requirements._metadata,
                    useMemory: content || true,
                },
            },
            createMemorySystemMessage(extraInstructions),
        );
    }

    /**
     * Gets human-readable titles for MEMORY tool functions.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return getMemoryToolTitles();
    }

    /**
     * Gets MEMORY tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createMemoryToolFunctions();
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
