import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { OllamaExecutionTools } from './OllamaExecutionTools';
import type { OllamaExecutionToolsOptions } from './OllamaExecutionToolsOptions';

/**
 * Execution Tools for calling Ollama API
 *
 * @public exported from `@promptbook/ollama`
 */
export const createOllamaExecutionTools = Object.assign(
    (options: OllamaExecutionToolsOptions): LlmExecutionTools => {
        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new OllamaExecutionTools(options);
    },
    {
        packageName: '@promptbook/ollama',
        className: 'OllamaExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;
