import type { string_book } from '../../../book-2.0/agent-source/string_book';

/**
 * Flags describing one persisted self-learning source update.
 *
 * @private internal self-learning contract for `Agent`
 */
export type SelfLearningPersistenceOptions = {
    /**
     * Marks the last source update of a single self-learning run.
     */
    readonly isFinal: boolean;
};

/**
 * Persists one self-learning source update outside the in-memory agent instance.
 *
 * @private internal self-learning contract for `Agent`
 */
export type PersistSelfLearningAgentSourceUpdate = (
    source: string_book,
    options: SelfLearningPersistenceOptions,
) => Promise<void>;

/**
 * Applies one source update back into the live agent and optional persistence layer.
 *
 * @private internal self-learning contract for `Agent`
 */
export type ApplySelfLearningAgentSourceUpdate = (
    source: string_book,
    options?: SelfLearningPersistenceOptions,
) => Promise<void>;

/**
 * Optional hook that can start META IMAGE materialization and return one background finalization task.
 *
 * The hook may update the agent source immediately (for example by inserting a stable placeholder URL)
 * and then return a promise that completes the final materialization later.
 *
 * @private internal self-learning contract for `Agent`
 */
export type SelfLearningMetaImageMaterializer = (options: {
    readonly getAgentSource: () => string_book;
    readonly applyAgentSourceUpdate: ApplySelfLearningAgentSourceUpdate;
}) => Promise<{
    readonly backgroundTask: Promise<void>;
} | null>;

/**
 * Schedules one self-learning background task outside the current request flow.
 *
 * @private internal self-learning contract for `Agent`
 */
export type SelfLearningBackgroundTaskScheduler = (task: Promise<void>) => void;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
