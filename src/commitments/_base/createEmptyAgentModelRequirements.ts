import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';

/**
 * Creates an empty/basic agent model requirements object
 * This serves as the starting point for the reduce-like pattern
 * where each commitment applies its changes to build the final requirements
 *
 * @public exported from `@promptbook/core`
 */
export function createEmptyAgentModelRequirements(): AgentModelRequirements {
    return {
        systemMessage: '',
        promptSuffix: '',
        // modelName: 'gpt-5',
        modelName: 'gemini-2.5-flash-lite', // <- TODO: !!! Pick best model in agents NOT the default one
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        parentAgentUrl: null, // <- TODO: But this should be maybe ADAM
        isClosed: false,
    };
}

/**
 * Creates a basic agent model requirements with just the agent name
 * This is used when we have an agent name but no commitments
 *
 * @public exported from `@promptbook/core`
 */
export function createBasicAgentModelRequirements(agentName: string | null): AgentModelRequirements {
    const empty = createEmptyAgentModelRequirements();

    return {
        ...empty,
        systemMessage: `You are ${agentName || 'AI Agent'}`,
    };
}

/**
 * TODO: [🐤] Deduplicate `AgentModelRequirements` and `ModelRequirements` model requirements
 */
