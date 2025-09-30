import spaceTrim from 'spacetrim';
import { DEFAULT_IS_VERBOSE } from '../../../config';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { string_markdown_text, string_mime_type_with_wildcard, string_user_id } from '../../../types/typeAliases';
import { $isRunningInBrowser } from '../../../utils/environment/$isRunningInBrowser';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { $isRunningInWebWorker } from '../../../utils/environment/$isRunningInWebWorker';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { joinLlmExecutionTools } from '../../_multiple/joinLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../../_multiple/MultipleLlmExecutionTools';
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
     * Title of the LLM tools
     *
     * @default 'LLM Tools from Configuration'
     */
    readonly title?: string_mime_type_with_wildcard & string_markdown_text;

    /**
     * This will will be passed to the created `LlmExecutionTools`
     *
     * @default false
     */
    readonly isVerbose?: boolean;

    /**
     * Identifier of the end user
     *
     * Note: This is passed to the LLM tools providers to identify misuse
     */
    readonly userId?: string_user_id;
};

/**
 * Creates LLM execution tools from provided configuration objects
 *
 * Instantiates and configures LLM tool instances for each configuration entry,
 * combining them into a unified interface via MultipleLlmExecutionTools.
 *
 * Note: This function is not cached, every call creates new instance of `MultipleLlmExecutionTools`
 *
 * @param configuration Array of LLM tool configurations to instantiate
 * @param options Additional options for configuring the LLM tools
 * @returns A unified interface combining all successfully instantiated LLM tools
 * @public exported from `@promptbook/core`
 */
export function createLlmToolsFromConfiguration(
    configuration: LlmToolsConfiguration,
    options: CreateLlmToolsFromConfigurationOptions = {},
): MultipleLlmExecutionTools {
    const { title = 'LLM Tools from Configuration', isVerbose = DEFAULT_IS_VERBOSE, userId } = options;

    const llmTools: ReadonlyArray<LlmExecutionTools> = configuration.map((llmConfiguration: TODO_any) => {
        const registeredItem = $llmToolsRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    llmConfiguration.packageName === packageName && llmConfiguration.className === className,
            );

        if (registeredItem === undefined) {
            // console.log('$llmToolsRegister.list()', $llmToolsRegister.list());
            throw new Error(
                spaceTrim(
                    (block) => `
                        There is no constructor for LLM provider \`${llmConfiguration.className}\` from \`${
                        llmConfiguration.packageName
                    }\`
                        Running in ${!$isRunningInBrowser() ? '' : 'browser environment'}${
                        !$isRunningInNode() ? '' : 'node environment'
                    }${!$isRunningInWebWorker() ? '' : 'worker environment'}

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

    return joinLlmExecutionTools(title, ...llmTools);
}

/**
 * TODO: [🎌] Together with `createLlmToolsFromConfiguration` + 'EXECUTION_TOOLS_CLASSES' gets to `@promptbook/core` ALL model providers, make this more efficient
 * TODO: [🧠][🎌] Dynamically install required providers
 * TODO: We should implement an interactive configuration wizard that would:
 *       1. Detect which LLM providers are available in the environment
 *       2. Guide users through required configuration settings for each provider
 *       3. Allow testing connections before completing setup
 *       4. Generate appropriate configuration code for application integration
 * TODO: [🧠][🍛] Which name is better `createLlmToolsFromConfig` or `createLlmToolsFromConfiguration`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 */
