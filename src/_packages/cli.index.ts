// @promptbook/cli

import { prettifyPromptbookStringCli } from '../conversion/prettify/prettifyPromptbookStringCli';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };
/**
 * Hidden utilities which should not be used by external consumers.
 */
const __ = {
    // Note: [🥠]
    prettifyPromptbookStringCli,
};

export { __ };
