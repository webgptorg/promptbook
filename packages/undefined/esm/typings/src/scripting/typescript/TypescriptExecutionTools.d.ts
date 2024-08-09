import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import type { ScriptExecutionToolsExecuteOptions } from '../../execution/ScriptExecutionTools';
/**
 * ScriptExecutionTools for TypeScript
 *
 * Warning: This is not implemented yet
 */
export declare class TypescriptExecutionTools implements ScriptExecutionTools {
    private readonly options;
    constructor(options?: CommonExecutionToolsOptions);
    /**
     * Executes a TypeScript
     */
    execute(options: ScriptExecutionToolsExecuteOptions): Promise<string>;
}
