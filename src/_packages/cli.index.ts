// @promptbook/cli

import { promptbookCli } from '../cli/promptbookCli';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

/**
 * Hidden utilities which should not be used by external consumers.
 */
const __ = {
    // Note: [🥠]
    promptbookCli,
};

export { __ };
