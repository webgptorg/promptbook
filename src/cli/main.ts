import { promptbookCli } from './promptbookCli';

/**
 * Hidden utilities which should not be used by external consumers.
 *
 * @public exported from `@promptbook/cli`
 */
export const _CLI = {
    // Note: [🥠]
    _initialize: promptbookCli,
};

/**
 * Note: [🟡] This code should never be published outside of `@promptbook/cli`
 */
