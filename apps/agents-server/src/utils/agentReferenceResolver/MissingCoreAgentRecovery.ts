/**
 * Recovery offered for a missing agent reference that points to one of the bundled core agents.
 *
 * A core agent is never created from scratch like an ordinary missing reference — it is reinstated from the book
 * bundled in the repository, together with every other core agent that happens to be missing at the same time.
 *
 * @private utility of Agents Server agent-reference diagnostics
 */
export type MissingCoreAgentRecovery = {
    /**
     * Titles of every bundled core agent currently missing on this server, including the referenced one.
     */
    readonly missingCoreAgentTitles: ReadonlyArray<string>;

    /**
     * Whether the current user is allowed to reinstate the missing core agents.
     */
    readonly isReinstateAllowed: boolean;
};
