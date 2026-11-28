import type { AgentBasicInformation } from '../../../../book-2.0/agent-source/AgentBasicInformation';
import type { AgentVisibility } from '../../../../book-2.0/agent-source/agentSourceVisibility';
import {
    DEFAULT_AGENT_VISIBILITY,
    parseAgentSourceVisibility,
    setAgentSourceVisibility,
} from '../../../../book-2.0/agent-source/agentSourceVisibility';
import { parseAgentSource } from '../../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import type { string_agent_permanent_id } from '../../../../types/string_agent_name';

/**
 * Options used while preparing a source for persistence.
 *
 * @private shared persistence helper for `AgentCollectionInSupabase`
 */
export type PrepareAgentSourceForPersistenceOptions = {
    /**
     * Visibility value that should be written into the book when present.
     */
    readonly visibility?: AgentVisibility | null;
    /**
     * Whether `visibility` should replace an existing `META VISIBILITY` commitment.
     */
    readonly isVisibilityOverride?: boolean;
};

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
    /**
     * Visibility parsed from the normalized source.
     */
    readonly visibility: AgentVisibility | undefined;
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
export function prepareAgentSourceForPersistence(
    agentSource: string_book,
    options: PrepareAgentSourceForPersistenceOptions = {},
): PreparedAgentSourceForPersistence {
    const originalAgentProfile = parseAgentSource(agentSource);
    const permanentId = originalAgentProfile.permanentId;

    agentSource = stripMetaIdLines(agentSource);
    const sourceVisibility = parseAgentSourceVisibility(agentSource, { isStrict: true });
    const resolvedVisibility =
        options.isVisibilityOverride || !sourceVisibility
            ? options.visibility ?? sourceVisibility ?? DEFAULT_AGENT_VISIBILITY
            : sourceVisibility;

    agentSource = setAgentSourceVisibility(agentSource, resolvedVisibility);

    const agentProfile = parseAgentSource(agentSource);
    const visibility = parseAgentSourceVisibility(agentSource, { isStrict: true }) ?? undefined;

    return {
        agentProfile,
        agentSource,
        permanentId,
        visibility,
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
