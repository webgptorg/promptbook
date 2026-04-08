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

/** Note: [🟡] Code for CLI entrypoint [main](src/cli/main.ts) should never be published outside of `@promptbook/cli` */
/** Note: [💞] Ignore a discrepancy between file name and entity name */
