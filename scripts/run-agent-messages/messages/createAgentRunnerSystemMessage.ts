import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirements } from '../../../src/book-2.0/agent-source/createAgentModelRequirements';
import type { AgentModelRequirements } from '../../../src/book-2.0/agent-source/AgentModelRequirements';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';

/**
 * Compiles agent source into the behavior text passed to CLI harness runners.
 */
export async function createAgentRunnerSystemMessage(agentSource: string_book): Promise<string> {
    return formatAgentModelRequirementsForRunner(await createAgentModelRequirements(agentSource));
}

/**
 * Formats prepared model requirements for a text-only CLI harness prompt.
 */
export function formatAgentModelRequirementsForRunner(modelRequirements: AgentModelRequirements): string {
    const promptSuffix = modelRequirements.promptSuffix.trim();

    return [
        modelRequirements.systemMessage.trim(),
        promptSuffix
            ? spaceTrim(
                  (block) => `
                      ## Prompt suffix
                      ${block(promptSuffix)}
                  `,
              )
            : '',
    ]
        .filter(Boolean)
        .join('\n\n');
}
