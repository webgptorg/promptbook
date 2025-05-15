import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import type { Registration } from '../../utils/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { OllamaExecutionTools } from './createOllamaExecutionTools';
import type { OllamaExecutionToolsOptions } from './OllamaExecutionToolsOptions';

export const createOllamaExecutionTools = Object.assign(
    (options: OllamaExecutionToolsOptions): OllamaExecutionTools => new OllamaExecutionTools(options),
    {
        packageName: '@promptbook/ollama',
        className: 'OllamaExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

export const _OllamaRegistration: Registration = $llmToolsRegister.register(createOllamaExecutionTools);
