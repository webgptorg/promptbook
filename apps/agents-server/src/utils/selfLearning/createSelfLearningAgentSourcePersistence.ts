import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_permanent_id } from '../../../../../src/types/typeAliases';

/**
 * Final history snapshot name used for completed self-learning runs.
 */
const SELF_LEARNING_HISTORY_VERSION_NAME = 'self-learning';

/**
 * Result returned by the self-learning persistence factory.
 */
export type SelfLearningAgentSourcePersistence = {
    /**
     * Persists one incremental or final self-learning source update.
     */
    readonly persistAgentSourceUpdate: (
        source: string_book,
        options: {
            readonly isFinal: boolean;
        },
    ) => Promise<void>;
    /**
     * Waits for all queued persistence writes to finish.
     */
    readonly waitForPendingSelfLearningPersistence: () => Promise<void>;
};

/**
 * Creates a persistence queue that keeps one self-learning run mapped to exactly one history snapshot row.
 */
export function createSelfLearningAgentSourcePersistence(options: {
    readonly collection: AgentCollection;
    readonly agentPermanentId: string_agent_permanent_id;
}): SelfLearningAgentSourcePersistence {
    let historySnapshotId: number | undefined = undefined;
    let pendingPersistence = Promise.resolve();
    let lastPersistenceError: unknown = null;

    /**
     * Queues one persistence write while keeping later writes ordered after earlier ones.
     */
    const enqueuePersistence = (operation: () => Promise<void>): Promise<void> => {
        const nextOperation = pendingPersistence.then(async () => {
            await operation();
            lastPersistenceError = null;
        });

        pendingPersistence = nextOperation.catch((error) => {
            lastPersistenceError = error;
        });

        return nextOperation;
    };

    return {
        persistAgentSourceUpdate: async (source, updateOptions) => {
            await enqueuePersistence(async () => {
                historySnapshotId = await options.collection.updateAgentSource(options.agentPermanentId, source, {
                    historySnapshotId,
                    versionName: updateOptions.isFinal ? SELF_LEARNING_HISTORY_VERSION_NAME : null,
                });
            });
        },
        waitForPendingSelfLearningPersistence: async () => {
            await pendingPersistence;

            if (lastPersistenceError) {
                throw lastPersistenceError;
            }
        },
    };
}
