import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * SAMPLE commitment definition
 *
 * The SAMPLE/EXAMPLE commitment provides examples of how the agent should respond
 * or behave in certain situations. These examples help guide the agent's responses.
 *
 * Example usage in agent source:
 * ```
 * SAMPLE When asked about pricing, respond: "Our basic plan starts at $10/month..."
 * EXAMPLE For code questions, always include working code snippets
 * ```
 */
export class SampleCommitmentDefinition extends BaseCommitmentDefinition {
    constructor(type: 'SAMPLE' | 'EXAMPLE' = 'SAMPLE') {
        super(type);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add example to the system message
        const exampleSection = `Example: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, exampleSection, '\n\n');
    }
}

/**
 * Singleton instances of the SAMPLE commitment definitions
 */
export const SampleCommitment = new SampleCommitmentDefinition('SAMPLE');
export const ExampleCommitment = new SampleCommitmentDefinition('EXAMPLE');

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
