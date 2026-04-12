import type { AgentBasicInformation } from '../../../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import type { CreateAgentInput } from '../../CreateAgentInput';
import { ZERO_USAGE } from '../../../../execution/utils/usage-constants';
import { $randomBase58 } from '../../../../utils/random/$randomBase58';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import type { AgentsDatabaseSchema } from './AgentsDatabaseSchema';
import { prepareAgentSourceForPersistence } from './prepareAgentSourceForPersistence';

/**
 * Optional persistence overrides for one new agent row.
 *
 * @private shared persistence helper for `AgentCollectionInSupabase`
 */
export type CreateAgentPersistenceRecordsOptions = Omit<CreateAgentInput, 'source'>;

/**
 * Prepared insert rows and returned profile for one newly persisted agent.
 *
 * @private shared persistence helper for `AgentCollectionInSupabase`
 */
export type CreateAgentPersistenceRecordsResult = {
    /**
     * Parsed created agent profile including the resolved permanent id.
     */
    readonly createdAgent: AgentBasicInformation & Required<Pick<AgentBasicInformation, 'permanentId'>>;

    /**
     * Insert row for the `Agent` table.
     */
    readonly agentInsertRecord: AgentsDatabaseSchema['public']['Tables']['Agent']['Insert'];

    /**
     * Insert row for the `AgentHistory` table.
     */
    readonly agentHistoryInsertRecord: AgentsDatabaseSchema['public']['Tables']['AgentHistory']['Insert'];
};

/**
 * Builds normalized insert rows for a newly created persisted agent.
 *
 * @param agentSource - Source content of the agent.
 * @param options - Optional folder placement, ordering, and visibility overrides.
 * @param createdAt - Shared creation timestamp used across all persisted rows.
 * @returns Insert rows and the created agent profile.
 *
 * @private shared persistence helper for `AgentCollectionInSupabase`
 */
export function createAgentPersistenceRecords(
    agentSource: string_book,
    options: CreateAgentPersistenceRecordsOptions = {},
    createdAt: string = new Date().toISOString(),
): CreateAgentPersistenceRecordsResult {
    const preparedAgentSource = prepareAgentSourceForPersistence(agentSource);
    const { agentProfile, agentSource: normalizedAgentSource } = preparedAgentSource;
    const permanentId = preparedAgentSource.permanentId || $randomBase58(14);
    const { agentName, agentHash } = agentProfile;

    const agentInsertRecord: AgentsDatabaseSchema['public']['Tables']['Agent']['Insert'] = {
        agentName,
        agentHash,
        permanentId,
        agentProfile,
        createdAt,
        updatedAt: null,
        promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        usage: ZERO_USAGE,
        agentSource: normalizedAgentSource,
    };

    if (options.folderId !== undefined) {
        agentInsertRecord.folderId = options.folderId;
    }
    if (options.sortOrder !== undefined) {
        agentInsertRecord.sortOrder = options.sortOrder;
    }
    if (options.visibility !== undefined) {
        agentInsertRecord.visibility = options.visibility;
    }

    return {
        createdAgent: {
            ...agentProfile,
            permanentId,
        },
        agentInsertRecord,
        agentHistoryInsertRecord: {
            createdAt,
            agentName,
            permanentId,
            agentHash,
            previousAgentHash: null,
            agentSource: normalizedAgentSource,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            versionName: null,
        },
    };
}
