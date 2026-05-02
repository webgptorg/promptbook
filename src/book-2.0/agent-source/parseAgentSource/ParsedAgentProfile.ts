import type { AgentBasicInformation } from '../AgentBasicInformation';

/**
 * Parsed agent profile fields accumulated from commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
export type ParsedAgentProfile = Pick<
    AgentBasicInformation,
    'meta' | 'links' | 'capabilities' | 'samples' | 'knowledgeSources'
>;
