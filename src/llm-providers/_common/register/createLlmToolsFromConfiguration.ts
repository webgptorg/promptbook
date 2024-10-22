import spaceTrim from 'spacetrim';
import { IS_VERBOSE } from '../../../config';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { string_user_id } from '../../../types/typeAliases';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { joinLlmExecutionTools } from '../../multiple/joinLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../../multiple/MultipleLlmExecutionTools';
import { $llmToolsRegister } from './$llmToolsRegister';
import { $registeredLlmToolsMessage } from './$registeredLlmToolsMessage';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * Options for `$provideLlmToolsFromEnv`
 *
 * @private internal type for `$provideLlmToolsFromEnv` and `$provideLlmToolsForTestingAndScriptsAndPlayground`
 */
export type CreateLlmToolsFromConfigurationOptions = {
    /**
     * This will will be passed to the created `LlmExecutionTools`
     *
     * @default false
     */
    isVerbose?: boolean;

    /**
     * Identifier of the end user
     *
     * Note: This is passed to the LLM tools providers to identify misuse
     */
    readonly userId?: string_user_id | null;
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
    const { isVerbose = IS_VERBOSE, userId } = options;

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

                        You have probably forgotten install and import the provider package.
                        To fix this issue, you can:

                        Install:

                        > npm install ${llmConfiguration.packageName}

                        And import:

                        > import '${llmConfiguration.packageName}';


                        ${block($registeredLlmToolsMessage())}
                    `,
                ),
            );
        }

        return registeredItem({
            isVerbose,
            userId,
            ...llmConfiguration.options,
        });
    });

    return joinLlmExecutionTools(...llmTools);
}

/**
 * TODO: [🎌] Together with `createLlmToolsFromConfiguration` + 'EXECUTION_TOOLS_CLASSES' gets to `@promptbook/core` ALL model providers, make this more efficient
 * TODO: [🧠][🎌] Dynamically install required providers
 * TODO: @@@ write discussion about this - wizzard
 * TODO: [🧠][🍛] Which name is better `createLlmToolsFromConfig` or `createLlmToolsFromConfiguration`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 */
