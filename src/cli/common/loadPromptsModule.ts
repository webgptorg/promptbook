import { createLazyModuleLoader } from '../../utils/misc/createLazyModuleLoader';

/**
 * Loads the interactive terminal prompt library (`prompts`) on demand
 *
 * Note: [🐌] Loaded lazily to keep the startup of the `ptbk` CLI utility fast - most commands never ask the user
 *       anything interactively
 *
 * @private internal utility of Promptbook CLI
 */
export const loadPromptsModule = createLazyModuleLoader(() => import('prompts'));

// Note: [🟡] Code for CLI prompt loading [loadPromptsModule](src/cli/common/loadPromptsModule.ts) should never be published outside of `@promptbook/cli`
