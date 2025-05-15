import { LlmExecutionToolsConstructor } from "../../execution/LlmExecutionToolsConstructor";
import { OllamaExecutionTools } from "./OllamaExecutionTools";
import { OllamaExecutionToolsOptions } from "./OllamaExecutionToolsOptions";

/**
 * Execution Tools for calling Ollama API
 *
 * @public exported from `@promptbook/ollama`
 */
export const createOllamaExecutionTools = Object.assign(
  (options: OllamaExecutionToolsOptions): OllamaExecutionTools => new OllamaExecutionTools(options),
  {
      packageName: '@promptbook/ollama',
      className: 'OllamaExecutionTools',
  },
) satisfies LlmExecutionToolsConstructor;