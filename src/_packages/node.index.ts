// @promptbook/node

import { createPromptbookLibraryFromDirectory } from '../promptbook-library/constructors/createPromptbookLibraryFromDirectory';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

// @promptbook/library
export { createPromptbookLibraryFromDirectory };

// TODO: [🧠][🍓] Maybe put here everything from @promptbook/core NOT only the Node-specific things
