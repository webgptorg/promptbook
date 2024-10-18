import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import type { ScriptExecutionToolsExecuteOptions } from '../../execution/ScriptExecutionTools';

/**
 * ScriptExecutionTools for Python
 *
 * Warning: This is not implemented yet
 *
 * @private still in development
 */
export class PythonExecutionTools implements ScriptExecutionTools {
    public constructor(protected readonly options: CommonToolsOptions = {}) {}

    /**
     * Executes a Python
     */
    public async execute(options: ScriptExecutionToolsExecuteOptions): Promise<string> {
        const { scriptLanguage, script } = options;

        if (scriptLanguage !== 'python') {
            throw new PipelineExecutionError(
                `Script language ${scriptLanguage} not supported to be executed by PythonExecutionTools`,
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

        throw new PipelineExecutionError('Not implemented');
    }
}
