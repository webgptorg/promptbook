/**
 * Result of one multi-repository auto-pull round.
 *
 * @private type of `runMultipleAgentMessages`
 */
export type MultiAgentAutoPullResult = {
    readonly isAnyRepositoryPulled: boolean;
    readonly pulledProjectPaths: ReadonlySet<string>;
};
