// @promptbook/node

import { createCollectionFromDirectory } from '../collection/constructors/createCollectionFromDirectory';
import { createLlmToolsFromEnv } from '../llm-providers/_common/createLlmToolsFromEnv';
import { PROMPTBOOK_VERSION } from '../version';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };

export { createCollectionFromDirectory, createLlmToolsFromEnv };

// TODO: [🧠][🍓] Maybe put here everything from @promptbook/core NOT only the Node-specific things
