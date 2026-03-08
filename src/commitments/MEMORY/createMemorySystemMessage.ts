import { spaceTrim } from 'spacetrim';
import { MemoryToolNames } from './MemoryToolNames';

/**
 * Builds the MEMORY instruction block appended to the system message.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function createMemorySystemMessage(extraInstructions: string): string {
    return spaceTrim(
        (block) => `
            Memory:
            - Prefer storing agent-scoped memories; only make them global when the fact should apply across all your agents.
            - You can use persistent user memory tools.
            - Use "${MemoryToolNames.retrieve}" to load relevant memory before answering.
            - Use "${MemoryToolNames.store}" to save stable user-specific facts that improve future help.
            - Use "${MemoryToolNames.update}" to refresh an existing memory when the content changes.
            - Use "${MemoryToolNames.delete}" to delete memories that are no longer accurate (deletions are soft and hidden from future queries).
            - Store concise memory items and avoid duplicates.
            - Never claim memory was saved or loaded unless the tool confirms it.
            ${block(extraInstructions)}
        `,
    );
}
