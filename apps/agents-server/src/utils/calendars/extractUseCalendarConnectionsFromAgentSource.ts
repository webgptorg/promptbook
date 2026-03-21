import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { extractUseCalendarReferencesFromCommitments } from '../../../../../src/commitments/USE_CALENDAR/calendarReference';

/**
 * Extracts USE CALENDAR references from agent source.
 */
export function extractUseCalendarConnectionsFromAgentSource(agentSource: string_book) {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    return extractUseCalendarReferencesFromCommitments(parseResult.commitments);
}
