import { createBasicAgentModelRequirements } from '../../commitments/_base/createEmptyAgentModelRequirements';
import { aggregateUseCommitmentSystemMessages } from '../../commitments/USE/aggregateUseCommitmentSystemMessages';
import type { string_model_name } from '../../types/typeAliases';
import type { AgentModelRequirements } from './AgentModelRequirements';
import type { CreateAgentModelRequirementsOptions } from './CreateAgentModelRequirementsOptions';
import { applyCommitmentsToAgentModelRequirements } from './createAgentModelRequirementsWithCommitments/applyCommitmentsToAgentModelRequirements';
import { augmentAgentModelRequirementsFromSource } from './createAgentModelRequirementsWithCommitments/augmentAgentModelRequirementsFromSource';
import { filterCommitmentsForAgentModelRequirements } from './createAgentModelRequirementsWithCommitments/filterCommitmentsForAgentModelRequirements';
import { materializeInlineKnowledgeSources } from './createAgentModelRequirementsWithCommitments/materializeInlineKnowledgeSources';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { removeCommentsFromSystemMessage } from './removeCommentsFromSystemMessage';
import type { string_book } from './string_book';

/**
 * Creates agent model requirements by parsing commitments, applying them in source order,
 * and finalizing derived sections such as imports, example interactions, and inline knowledge uploads.
 *
 * @param agentSource - Agent source book to parse.
 * @param modelName - Optional override for the agent model name.
 * @param options - Additional options such as reference and teammate resolvers.
 * @returns Fully prepared model requirements for the parsed agent source.
 *
 * @private internal utility of `createAgentModelRequirements`
 */
export async function createAgentModelRequirementsWithCommitments(
    agentSource: string_book,
    modelName?: string_model_name,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    const filteredCommitments = filterCommitmentsForAgentModelRequirements(parseResult.commitments);

    let requirements = createInitialAgentModelRequirements(parseResult.agentName, modelName);
    requirements = await applyCommitmentsToAgentModelRequirements(requirements, filteredCommitments, options);
    requirements = aggregateUseCommitmentSystemMessages(requirements, filteredCommitments);
    requirements = await augmentAgentModelRequirementsFromSource(requirements, parseResult, agentSource);
    requirements = await materializeInlineKnowledgeSources(requirements, options?.inlineKnowledgeSourceUploader);

    return finalizeRequirements(requirements);
}

/**
 * Creates the initial requirements object with the parsed agent name stored in metadata and an optional model override.
 *
 * @param agentName - Parsed agent name from the source prelude.
 * @param modelName - Optional explicit model name override.
 * @returns Initial requirements before any commitment is applied.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function createInitialAgentModelRequirements(
    agentName: string | null,
    modelName?: string_model_name,
): AgentModelRequirements {
    const initialRequirements = createBasicAgentModelRequirements(agentName);
    const requirementsWithMetadata: AgentModelRequirements = {
        ...initialRequirements,
        _metadata: {
            ...initialRequirements._metadata,
            agentName,
        },
    };

    if (!modelName) {
        return requirementsWithMetadata;
    }

    return {
        ...requirementsWithMetadata,
        modelName,
    };
}

/**
 * Performs the final system-message cleanup pass after all other augmentation steps are complete.
 *
 * @param requirements - Fully built requirements before final cleanup.
 * @returns Requirements with comment lines removed from the final system message.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function finalizeRequirements(requirements: AgentModelRequirements): AgentModelRequirements {
    return {
        ...requirements,
        systemMessage: removeCommentsFromSystemMessage(requirements.systemMessage),
    };
}
