import { spaceTrim } from 'spacetrim';

/**
 * Markdown documentation for MEMORY commitment.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function getMemoryCommitmentDocumentation(type: 'MEMORY' | 'MEMORIES'): string {
    return spaceTrim(`
        # ${type}

        Enables persistent user memory for the current agent. The memory is stored by the runtime and can be retrieved in future conversations.

        ## Key aspects

        - Both \`MEMORY\` and \`MEMORIES\` work identically.
        - Stores user-specific details through runtime tools.
        - Retrieves relevant memories for personalized responses.
        - Supports optional extra instructions in the commitment content.

        ## Examples

        \`\`\`book
        Personal Assistant

        PERSONA You are a personal productivity assistant
        MEMORY Remember user projects and long-term preferences.
        GOAL Help optimize daily productivity and workflow
        \`\`\`

        \`\`\`book
        Learning Companion

        PERSONA You are an educational companion for programming students
        MEMORY Remember only the student's learning progress and preferred study style.
        GOAL Provide progressive learning experiences tailored to student's pace
        \`\`\`

        \`\`\`book
        Customer Support Agent

        PERSONA You are a customer support representative
        MEMORY Remember only important support history and communication preferences.
        GOAL Provide personalized support based on customer history
        \`\`\`
    `);
}
