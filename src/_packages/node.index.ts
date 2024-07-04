// @promptbook/node

import { createLibraryFromDirectory } from '../library/constructors/createLibraryFromDirectory';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

// @promptbook/library
export { createLibraryFromDirectory };

// TODO: [🧠][🍓] Maybe put here everything from @promptbook/core NOT only the Node-specific things
