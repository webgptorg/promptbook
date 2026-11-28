/**
 * Local runner limits loaded from the running Agents Server app.
 *
 * @private internal type of `startAgentsServer`
 */
export type LocalAgentRunnerLimits = {
    readonly maxFailedAttempts: number;
    readonly maxParallelMessages: number;
};
