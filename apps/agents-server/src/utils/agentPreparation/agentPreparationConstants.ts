/**
 * Debounce window for agent pre-indexing.
 *
 * @private function of agentPreparation
 */
export const AGENT_PREPARATION_DEBOUNCE_MS = 30_000;

/**
 * Maximum number of jobs processed per worker tick and table prefix.
 *
 * @private function of agentPreparation
 */
export const AGENT_PREPARATION_MAX_JOBS_PER_TICK = 2;

/**
 * Small wake-up buffer used when scheduling one-shot worker kicks.
 *
 * @private function of agentPreparation
 */
export const AGENT_PREPARATION_WAKEUP_BUFFER_MS = 100;

/**
 * Maximum wait for chat routes that decide to wait for a currently running preparation.
 */
export const AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS = 2_500;

/**
 * Default polling interval used while waiting for a running preparation.
 *
 * @private function of agentPreparation
 */
export const AGENT_PREPARATION_WAIT_POLL_INTERVAL_MS = 500;

/**
 * Initial retry delay after one failed background preparation run.
 *
 * @private function of agentPreparation
 */
export const AGENT_PREPARATION_FAILURE_BACKOFF_BASE_MS = 30_000;

/**
 * Maximum retry delay after repeated failed background preparation runs.
 *
 * @private function of agentPreparation
 */
export const AGENT_PREPARATION_FAILURE_BACKOFF_MAX_MS = 15 * 60_000;
