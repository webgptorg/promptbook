// @promptbook/node

import { createCollectionFromDirectory } from '../library/constructors/createCollectionFromDirectory';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

// @promptbook/library
export { createCollectionFromDirectory };

// TODO: [🧠][🍓] Maybe put here everything from @promptbook/core NOT only the Node-specific things
