import { $runPromptbookCli } from './$runPromptbookCli';

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
    _initialize_promptbookCli: $runPromptbookCli,
};

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
