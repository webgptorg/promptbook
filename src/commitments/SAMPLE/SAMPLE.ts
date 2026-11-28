import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createWritingSampleSection } from '../_common/createWritingCommitmentSections';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * Legacy `SAMPLE` / `EXAMPLE` commitment definition.
 *
 * It stays runtime-compatible, but authors should migrate to `WRITING SAMPLE`
 * for writing voice exemplars.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class SampleCommitmentDefinition extends BaseCommitmentDefinition<'SAMPLE' | 'EXAMPLE'> {
    public constructor(type: 'SAMPLE' | 'EXAMPLE' = 'SAMPLE') {
        super(type);
    }

    /**
     * Short one-line description of `SAMPLE` / `EXAMPLE`.
     */
    public get description(): string {
        return 'Deprecated legacy alias for `WRITING SAMPLE`.';
    }

    /**
     * Optional UI/docs-only deprecation metadata.
     */
    public override get deprecation() {
        return {
            message: 'Use `WRITING SAMPLE` for explicit voice exemplars.',
            replacedBy: ['WRITING SAMPLE'],
        } as const;
    }

    /**
     * Icon for `SAMPLE` / `EXAMPLE`.
     */
    public get icon(): string {
        return '🗣️';
    }

    /**
     * Markdown documentation for `SAMPLE` / `EXAMPLE`.
     */
    public get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Deprecated legacy alias for \`WRITING SAMPLE\`.

            ## Migration

            - Existing \`${this.type}\` blocks still work.
            - New books should use \`WRITING SAMPLE\` instead.
            - Runtime behavior is intentionally unchanged for backward compatibility.

            ## Preferred replacement

            \`\`\`book
            Copywriter

            PERSONA You are a Copywriter who writes persuasive marketing copy.
            WRITING SAMPLE
            Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
            \`\`\`

            ## Legacy compatibility example

            \`\`\`book
            Copywriter

            PERSONA You are a Copywriter who writes persuasive marketing copy.
            ${this.type}
            Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
            \`\`\`
        `);
    }

    public applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        return this.appendToSystemMessage(
            requirements,
            this.createSystemMessageSection('Writing sample', createWritingSampleSection(trimmedContent)),
            '\n\n',
        );
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
