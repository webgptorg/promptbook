import { promptbookCli } from './promptbookCli';

/**
 * Note: [🔺] Purpose of this file is to export CLI for production environment
 */

/**
 * Hidden utilities which should not be used by external consumers.
 *
 * @public exported from `@promptbook/cli`
 */
export const _CLI = {
    // Note: [🥠]
    _initialize_promptbookCli: promptbookCli,
};

/**
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
