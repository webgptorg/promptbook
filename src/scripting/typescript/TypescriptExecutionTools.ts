import { spaceTrim } from 'spacetrim';
import { ExecutionError } from '../../errors/ExecutionError';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import type { ScriptExecutionToolsExecuteOptions } from '../../execution/ScriptExecutionTools';

/**
 * ScriptExecutionTools for TypeScript
 *
 * Warning: This is not implemented yet
 */
export class TypescriptExecutionTools implements ScriptExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions = {}) {}

    /**
     * Executes a TypeScript
     */
    public async execute(options: ScriptExecutionToolsExecuteOptions): Promise<string> {
        const { scriptLanguage, script } = options;

        if (scriptLanguage !== 'typescript') {
            throw new ExecutionError(
                `Script language ${scriptLanguage} not supported to be executed by TypescriptExecutionTools`,
            );
        }

        if (this.options.isVerbose) {
            console.info(
                spaceTrim(
                    (block) => `
                        🚀 NOT Evaluating ${scriptLanguage} script:

                        ${block(script)}`,
                ),
            );
        }

        throw new ExecutionError('Not implemented');
    }
}
