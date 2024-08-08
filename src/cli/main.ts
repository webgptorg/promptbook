import { promptbookCli } from './promptbookCli';

/**
 * Hidden utilities which should not be used by external consumers.
 */
export const __CLI = {
    // Note: [🥠]
    __initialize: promptbookCli,
};
