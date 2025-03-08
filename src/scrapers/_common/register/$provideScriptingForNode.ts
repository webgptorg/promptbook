import { JavascriptExecutionTools } from '../../../scripting/javascript/JavascriptExecutionTools';
import { DEFAULT_IS_AUTO_INSTALLED } from '../../../config';
import { DEFAULT_IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { ScriptExecutionTools } from '../../../execution/ScriptExecutionTools';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { TODO_USE } from '../../../utils/organization/TODO_USE';

/**
 * Provides script execution tools
 *
 * @public exported from `@promptbook/node`
 */
export async function $provideScriptingForNode(
    options?: PrepareAndScrapeOptions,
): Promise<ReadonlyArray<ScriptExecutionTools>> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideScriptingForNode` works only in Node.js environment');
    }

    const { isAutoInstalled = DEFAULT_IS_AUTO_INSTALLED, isVerbose = DEFAULT_IS_VERBOSE } = options || {};

    TODO_USE(isAutoInstalled);
    TODO_USE(isVerbose);

    // TODO: [🔱] Do here auto-installation

    return [new JavascriptExecutionTools(options)];
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
