import spaceTrim from 'spacetrim';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { joinLlmExecutionTools } from '../multiple/joinLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../multiple/MultipleLlmExecutionTools';
import { $llmToolsRegister } from './$llmToolsRegister';
import { $registeredLlmToolsMessage } from './$registeredLlmToolsMessage';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

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
 * @public exported from `@promptbook/core`
 */
export function createLlmToolsFromConfiguration(
    configuration: LlmToolsConfiguration,
    options: CreateLlmToolsFromConfigurationOptions = {},
): MultipleLlmExecutionTools {
    const { isVerbose = false } = options;

    const llmTools: Array<LlmExecutionTools> = configuration.map((llmConfiguration: TODO_any) => {
        const registeredItem = $llmToolsRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    llmConfiguration.packageName === packageName && llmConfiguration.className === className,
            );

        if (registeredItem === undefined) {
            throw new Error(
                spaceTrim(
                    (block) => `
                        There is no constructor for LLM provider \`${llmConfiguration.className}\` from \`${
                        llmConfiguration.packageName
                    }\`

                        ${block($registeredLlmToolsMessage())}}
                    `,
                ),
            );
        }

        return registeredItem.constructor({
            isVerbose,
            ...llmConfiguration.options,
        });
    });

    return joinLlmExecutionTools(...llmTools);
}

/**
 * TODO: [🎌] Togethere with `createLlmToolsFromConfiguration` + 'EXECUTION_TOOLS_CLASSES' gets to `@promptbook/core` ALL model providers, make this more efficient
 * TODO: [🧠][🎌] Dynamically install required providers
 * TODO: @@@ write discussion about this - wizzard
 * TODO: [🧠][🍛] Which name is better `createLlmToolsFromConfig` or `createLlmToolsFromConfiguration`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: This should be maybe not under `_common` but under `utils`
 */
