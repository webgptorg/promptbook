// @promptbook/cli

import { promptbookCli } from '../cli/promptbookCli';

// Note: Exporting version from each package

/**
 * Hidden utilities which should not be used by external consumers.
 */
const __CLI = {
    // Note: [🥠]
    __initialize: promptbookCli,
};

export { __CLI };
