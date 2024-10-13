import spaceTrim from 'spacetrim';
import { IS_VERBOSE } from '../../../config';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { joinLlmExecutionTools } from '../../multiple/joinLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../../multiple/MultipleLlmExecutionTools';
import { $registeredScrapersMessage } from './$registeredScrapersMessage';
import { $scrapersRegister } from './$scrapersRegister';
import type { ScraperConfiguration } from './ScraperConfiguration';

/**
 * Options for `createScrapersFromEnv`
 *
 * @private internal type for `createScrapersFromEnv` and `getScrapersForTestingAndScriptsAndPlayground`
 */
export type CreateScrapersFromConfigurationOptions = {
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
export function createScrapersFromConfiguration(
    configuration: ScraperConfiguration,
    options: CreateScrapersFromConfigurationOptions = {},
): MultipleLlmExecutionTools {
    const { isVerbose = IS_VERBOSE } = options;

    const scrapers: Array<LlmExecutionTools> = configuration.map((scraperConfiguration: TODO_any) => {
        const registeredItem = $scrapersRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    scraperConfiguration.packageName === packageName && scraperConfiguration.className === className,
            );

        if (registeredItem === undefined) {
            throw new Error(
                spaceTrim(
                    (block) => `
                        There is no constructor for LLM provider \`${scraperConfiguration.className}\` from \`${
                        scraperConfiguration.packageName
                    }\`

                        You have probably forgotten install and import the provider package.
                        To fix this issue, you can:

                        Install:

                        > npm install ${scraperConfiguration.packageName}

                        And import:

                        > import '${scraperConfiguration.packageName}';


                        ${block($registeredScrapersMessage())}
                    `,
                ),
            );
        }

        return registeredItem({
            isVerbose,
            ...scraperConfiguration.options,
        });
    });

    return joinLlmExecutionTools(...scrapers);
}

/**
 * TODO: [🎌] Together with `createScrapersFromConfiguration` + 'EXECUTION_TOOLS_CLASSES' gets to `@promptbook/core` ALL model providers, make this more efficient
 * TODO: [🧠][🎌] Dynamically install required providers
 * TODO: @@@ write discussion about this - wizzard
 * TODO: [🧠][🍛] Which name is better `createScrapersFromConfig` or `createScrapersFromConfiguration`?
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [®] DRY Register logic
 */
