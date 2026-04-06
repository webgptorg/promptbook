import type { AgentReferenceResolver } from './AgentReferenceResolver';
import type { InlineKnowledgeSourceUploader } from '../../utils/knowledge/inlineKnowledgeSource';
import type { TeammateProfileResolver } from './TeammateProfileResolver';

/**
 * Options for `createAgentModelRequirements` and `createAgentModelRequirementsWithCommitments`.
 *
 * @public exported from `@promptbook/core`
 */
export type CreateAgentModelRequirementsOptions = {
    /**
     * Resolver that transforms compact agent references (FROM, IMPORT, TEAM) into concrete URLs.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;

    /**
     * Optional hook used to upload inline knowledge files before finalizing the requirements.
     */
    readonly inlineKnowledgeSourceUploader?: InlineKnowledgeSourceUploader;

    /**
     * Optional resolver that provides actual agent names and descriptions for teammate URLs.
     *
     * When provided, TEAM tools are created with the agent's real human-readable name and
     * persona description rather than technical IDs derived from URL path segments.
     */
    readonly teammateProfileResolver?: TeammateProfileResolver;
};
