import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { extractUseProjectRepositoryUrlsFromCommitments } from '../../../../../src/commitments/USE_PROJECT/projectReference';

/**
 * Extracts canonical GitHub repository URLs declared by `USE PROJECT` commitments in agent source.
 */
export function extractProjectRepositoriesFromAgentSource(agentSource: string_book): string[] {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    return extractUseProjectRepositoryUrlsFromCommitments(parseResult.commitments);
}
