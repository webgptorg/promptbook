import { DEFAULT_MODEL_ID } from '../../../constants/models';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * Creates an empty/basic agent model requirements object
 * This serves as the starting point for the reduce-like pattern
 * where each commitment applies its changes to build the final requirements
 */
export function createEmptyAgentModelRequirements(): AgentModelRequirements {
    return {
        systemMessage: '',
        modelName: DEFAULT_MODEL_ID,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
    };
}

/**
 * Creates a basic agent model requirements with just the agent name
 * This is used when we have an agent name but no commitments
 */
export function createBasicAgentModelRequirements(agentName: string | null): AgentModelRequirements {
    const empty = createEmptyAgentModelRequirements();

    return {
        ...empty,
        systemMessage: `You are ${agentName || 'AI Agent'}`,
    };
}
