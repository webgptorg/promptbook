import { createLazyModuleLoader } from '../../../utils/misc/createLazyModuleLoader';

/**
 * Loads the OpenAI AgentKit SDK (`@openai/agents`) on demand
 *
 * Note: [🐌] The AgentKit SDK is one of the heaviest dependencies of Promptbook, loading it eagerly would slow down
 *       every single run of the `ptbk` CLI utility even when no AgentKit agent is used
 *
 * @private internal utility of `@promptbook/openai`
 */
export const loadOpenAiAgentsModule = createLazyModuleLoader(() => import('@openai/agents'));
