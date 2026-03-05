import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { keepUnused } from '../../utils/organization/keepUnused';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * INTERNAL MESSAGE commitment definition
 *
 * The INTERNAL MESSAGE commitment stores model-internal trace records related to one interaction
 * (for example tool calls, raw request/response payloads, or reasoning metadata).
 *
 * Example usage in agent source:
 *
 * ```book
 * INTERNAL MESSAGE
 * {"kind":"TOOL_CALL","toolCall":{"name":"search"}}
 * ```
 *
 * @private Internal commitment used by self-learning sampling.
 */
export class InternalMessageCommitmentDefinition extends BaseCommitmentDefinition<'INTERNAL MESSAGE'> {
    public constructor() {
        super('INTERNAL MESSAGE');
    }

    /**
     * Short one-line description of INTERNAL MESSAGE.
     */
    get description(): string {
        return 'Defines an **internal trace message** (tool calls/thinking metadata) in conversation history.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧩';
    }

    /**
     * Markdown documentation for INTERNAL MESSAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines an internal trace message related to one interaction. This is intended mainly for self-learning analytics and future training datasets.

            ## Key aspects

            - Stores internal execution context such as tool-call payloads.
            - Can contain structured JSON payloads.
            - Preserves additional context between USER MESSAGE and AGENT MESSAGE.
            - Does not directly modify model requirements.

            ## Examples

            \`\`\`book
            USER MESSAGE
            Search latest weather in Prague.

            INTERNAL MESSAGE
            {
                "kind": "TOOL_CALL",
                "toolCall": {
                    "name": "search",
                    "arguments": "{\\"q\\":\\"weather Prague\\"}",
                    "result": "..."
                }
            }

            AGENT MESSAGE
            It looks partly cloudy in Prague.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // INTERNAL MESSAGE records are for traceability and analytics.
        // They should not alter runtime prompting behavior.
        keepUnused(content);
        return requirements;
    }
}
