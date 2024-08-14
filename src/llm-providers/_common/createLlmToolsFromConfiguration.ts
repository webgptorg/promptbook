import * as dotenv from 'dotenv';
import { TODO_any } from '../../_packages/types.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { joinLlmExecutionTools } from '../multiple/joinLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../multiple/MultipleLlmExecutionTools';
import { EXECUTION_TOOLS_CLASSES } from './config';
import { LlmToolsConfiguration } from './LlmConfiguration';

/**
 * Options for `createLlmToolsFromEnv`
 *
 * @private internal type for `createLlmToolsFromEnv` and `getLlmToolsForTestingAndScriptsAndPlayground`
 */
export type CreateLlmToolsFromConfigurationOptions = {
    /**
     * This will will be passed to the created `LlmExecutionTools`
     *
     * @default false
     */
    isVerbose?: boolean;
};

/**
 * @@@
 *
 * Note: This function is not cached, every call creates new instance of `MultipleLlmExecutionTools`
 *
 * @returns @@@
 * @public exported from `@promptbook/node`
 */
export function createLlmToolsFromConfiguration(
    configuration: LlmToolsConfiguration,
    options: CreateLlmToolsFromConfigurationOptions = {},
): MultipleLlmExecutionTools {
    if (!isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `createLlmToolsFromEnv` works only in Node.js environment');
    }

    const { isVerbose = false } = options;

    dotenv.config();

    const llmTools: Array<LlmExecutionTools> = configuration.map((llmConfiguration: TODO_any) =>
        EXECUTION_TOOLS_CLASSES[`get${llmConfiguration.className}`]!(
            //                                                      <- TODO: !!! Check that defined
            {
                isVerbose,
                ...llmConfiguration.options,
            },
        ),
    );

    return joinLlmExecutionTools(...llmTools);
}

/**
 * TODO: [🧠][🎌] Dynamically install required providers
 * TODO: @@@ write discussion about this - wizzard
 * TODO: [🧠][🍛] Which name is better `createLlmToolsFromConfig` or `createLlmToolsFromConfiguration`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] This code should never be published outside of `@promptbook/node` and `@promptbook/cli` and `@promptbook/cli`
 * TODO: This should be maybe not under `_common` but under `utils`
 */
