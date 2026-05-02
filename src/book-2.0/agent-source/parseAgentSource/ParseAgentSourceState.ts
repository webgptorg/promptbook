import type { ParsedAgentProfile } from './ParsedAgentProfile';

/**
 * Mutable commitment-processing state used while collecting basic profile information.
 *
 * @private internal utility of `parseAgentSource`
 */
export type ParseAgentSourceState = ParsedAgentProfile & {
    pendingUserMessage: string | null;
    knownKnowledgeSourceUrls: Set<string>;
};
