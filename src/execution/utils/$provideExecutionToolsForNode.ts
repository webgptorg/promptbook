import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { JavascriptExecutionTools } from '../../_packages/execute-javascript.index';
import { $provideLlmToolsFromEnv } from '../../_packages/node.index';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { ExecutionTools } from '../ExecutionTools';

/**
 * Note: There is unfortunately no equivalent for this function in the browser environment
 *       because it is not possible automatically detect configured LLM providers
 *       you need to provide them manually BUT you can help by utilities like `$provideScrapersForBrowser()`
 *
 * @public exported from `@promptbook/node`
 */
export async function $provideExecutionToolsForNode(options?: PrepareAndScrapeOptions): Promise<ExecutionTools> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getExecutionToolsForNode` works only in Node.js environment');
    }

    const tools = {
        llm: $provideLlmToolsFromEnv(options),
        scrapers: await $provideScrapersForNode(options),
        script: [
            new JavascriptExecutionTools(
                //            <- TODO: [🧱] Implement in a functional (not new Class) way
                options,
            ),
        ],
    } satisfies ExecutionTools;

    return tools;
}

/**
 * Note: [🟡 <- TODO: !!!!!! Included in $provideExecutionTools] Code in this file should never be published outside of `@promptbook/cli`
 */
