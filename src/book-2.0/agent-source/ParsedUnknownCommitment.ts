/**
 * An uppercase Book commitment block whose keyword is not registered by Promptbook.
 *
 * Unknown commitments are retained as system-message context instead of being applied
 * as executable commitments.
 *
 * @private internal type of `parseAgentSourceWithCommitments`
 */
export type ParsedUnknownCommitment = {
    /**
     * Uppercase unknown commitment type, for example `FOO` or `BAR BZZ`.
     */
    readonly type: string;

    /**
     * Original first line, retained for precise editor diagnostics.
     */
    readonly originalLine: string;

    /**
     * Line number in the agent source (1-based).
     */
    readonly lineNumber: number;

    /**
     * Complete unknown commitment block, including its keyword and continuation lines.
     */
    readonly source: string;
};
