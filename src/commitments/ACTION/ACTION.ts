import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * ACTION commitment definition
 *
 * Deprecated legacy commitment for broad capability notes.
 * New books should prefer the appropriate `USE*` commitment instead.
 *
 * Example usage in agent source:
 *
 * ```book
 * ACTION Can generate code snippets and explain programming concepts
 * ACTION Able to analyze data and provide insights
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ActionCommitmentDefinition extends BaseCommitmentDefinition<'ACTION' | 'ACTIONS'> {
    public constructor(type: 'ACTION' | 'ACTIONS' = 'ACTION') {
        super(type);
    }

    /**
     * Short one-line description of ACTION.
     */
    get description(): string {
        return 'Deprecated legacy capability commitment. Prefer concrete `USE*` commitments.';
    }

    /**
     * Optional UI/docs-only deprecation metadata.
     */
    public override get deprecation() {
        return {
            message: 'Use a concrete `USE*` commitment instead.',
        } as const;
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '⚡';
    }

    /**
     * Markdown documentation for ACTION commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Deprecated legacy commitment for broad capability notes.

            ## Migration

            - Existing \`${this.type}\` and \`ACTIONS\` books still parse and compile.
            - New books should prefer the appropriate \`USE*\` commitment instead.
            - Keep \`${this.type}\` only when maintaining older books that already rely on it.

            ## Preferred replacement

            \`\`\`book
            Research Assistant

            PERSONA You are a helpful research assistant
            USE SEARCH ENGINE
            RULE Always cite your sources when providing information from the web
            \`\`\`

            ## Legacy compatibility example

            \`\`\`book
            Research Assistant

            PERSONA You are a helpful research assistant
            ACTION Can search for current information and summarize findings
            RULE Always cite your sources when providing information from the web
            \`\`\`

            ## Legacy compatibility example with additional tools

            \`\`\`book
            Code Assistant

            PERSONA You are a programming assistant
            USE BROWSER
            USE SEARCH ENGINE
            RULE Prefer the narrowest useful capability for the task.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Keep the legacy capability note for backward compatibility.
        const actionSection = `Capability: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, actionSection, '\n\n');
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
