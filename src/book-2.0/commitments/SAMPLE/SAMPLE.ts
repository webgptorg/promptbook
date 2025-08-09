import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * SAMPLE commitment definition
 *
 * The SAMPLE/EXAMPLE commitment provides examples of how the agent should respond
 * or behave in certain situations. These examples help guide the agent's responses.
 *
 * Example usage in agent source:
 *
 * ```book
 * SAMPLE When asked about pricing, respond: "Our basic plan starts at $10/month..."
 * EXAMPLE For code questions, always include working code snippets
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class SampleCommitmentDefinition extends BaseCommitmentDefinition<'SAMPLE' | 'EXAMPLE'> {
    constructor(type: 'SAMPLE' | 'EXAMPLE' = 'SAMPLE') {
        super(type);
    }

    /**
     * Short one-line description of SAMPLE/EXAMPLE.
     */
    get description(): string {
        return 'Provide example responses to guide behavior.';
    }

    /**
     * Markdown documentation for SAMPLE/EXAMPLE commitment.
     */
    get documentation(): string {
        return [
            `# ${this.type}`,
            '',
            'Provides examples of how the agent should respond or behave in certain situations.',
            '',
            'Effects on system message:',
            '- Appends an "Example: ..." line to the system message.',
            '',
            'Examples:',
            '```book',
            'SAMPLE When asked about pricing, respond: "Our basic plan starts at $10/month..."',
            'EXAMPLE For code questions, always include working code snippets',
            '```',
            '',
        ]
            .join('\\n')
            .replace(/\\\\n/g, '\\n');
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
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const SampleCommitment = new SampleCommitmentDefinition('SAMPLE');

/**
 * Singleton instances of the SAMPLE commitment definitions
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const ExampleCommitment = new SampleCommitmentDefinition('EXAMPLE');

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
