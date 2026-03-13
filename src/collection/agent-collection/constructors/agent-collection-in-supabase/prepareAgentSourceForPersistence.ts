import type { AgentBasicInformation } from '../../../../book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSource } from '../../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import type { string_agent_permanent_id } from '../../../../types/typeAliases';

/**
 * Prepared agent source payload ready for database persistence.
 *
 * The original source may contain `META ID`, which should not be stored verbatim
 * because clones and imports must receive a fresh local permanent id.
 *
 * @private shared persistence helper for `AgentCollectionInSupabase`
 */
export type PreparedAgentSourceForPersistence = {
    /**
     * Parsed profile based on the normalized source that will be stored.
     */
    readonly agentProfile: AgentBasicInformation;
    /**
     * Source normalized for persistence, with any `META ID` lines removed.
     */
    readonly agentSource: string_book;
    /**
     * Permanent id extracted from the original source before stripping `META ID`.
     */
    readonly permanentId: string_agent_permanent_id | undefined;
};

/**
 * Normalizes one agent source before persistence.
 *
 * This keeps create/update flows aligned when a source includes `META ID`.
 *
 * @param agentSource - Raw agent source about to be stored.
 * @returns Parsed profile, normalized source, and extracted permanent id.
 *
 * @private shared persistence helper for `AgentCollectionInSupabase`
 */
export function prepareAgentSourceForPersistence(agentSource: string_book): PreparedAgentSourceForPersistence {
    let agentProfile = parseAgentSource(agentSource);
    const permanentId = agentProfile.permanentId;

    const strippedAgentSource = stripMetaIdLines(agentSource);
    if (strippedAgentSource !== agentSource) {
        agentSource = strippedAgentSource;
        agentProfile = parseAgentSource(agentSource);
    }

    return {
        agentProfile,
        agentSource,
        permanentId,
    };
}

/**
 * Removes persisted `META ID` lines from the stored source representation.
 *
 * @param agentSource - Raw agent source.
 * @returns Source without `META ID` lines.
 *
 * @private utility of `prepareAgentSourceForPersistence`
 */
function stripMetaIdLines(agentSource: string_book): string_book {
    const lines = agentSource.split(/\r?\n/);
    const strippedLines = lines.filter((line) => !line.trim().startsWith('META ID '));

    if (lines.length === strippedLines.length) {
        return agentSource;
    }

    return strippedLines.join('\n') as string_book;
}
