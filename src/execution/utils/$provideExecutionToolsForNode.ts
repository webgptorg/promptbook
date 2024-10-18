import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { $provideLlmToolsFromEnv } from '../../llm-providers/_common/register/$provideLlmToolsFromEnv';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { JavascriptExecutionTools } from '../../scripting/javascript/JavascriptExecutionTools';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import type { ExecutionTools } from '../ExecutionTools';

/**
 * Note: There is unfortunately no equivalent for this function in the browser environment
 *       because it is not possible automatically detect configured LLM providers
 *       you need to provide them manually BUT you can help by utilities like `$provideScrapersForBrowser`
 *
 * @public exported from `@promptbook/node`
 */
export async function $provideExecutionToolsForNode(options?: PrepareAndScrapeOptions): Promise<ExecutionTools> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getExecutionToolsForNode` works only in Node.js environment');
    }

    const llm = $provideLlmToolsFromEnv(options);

    const tools = {
        llm,
        fs: $provideFilesystemForNode(),
        scrapers: await $provideScrapersForNode({ llm }, options),
        script: [new JavascriptExecutionTools(options)],
    } satisfies ExecutionTools;

    return tools;
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
