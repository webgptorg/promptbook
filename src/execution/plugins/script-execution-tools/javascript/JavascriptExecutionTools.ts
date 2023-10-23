import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';
import { ScriptExecutionTools, ScriptExecutionToolsExecuteOptions } from '../../../ScriptExecutionTools';

/**
 * ScriptExecutionTools for JavaScript implemented via vm2
 *
 * Warning: This is not implemented yet
 */
export class JavascriptExecutionTools implements ScriptExecutionTools {
    public constructor(private readonly options: CommonExecutionToolsOptions) {}

    /**
     * Executes a JavaScript
     */
    public async execute(options: ScriptExecutionToolsExecuteOptions): Promise<string> {
        const { scriptLanguage, script, parameters } = options;

        if (scriptLanguage !== 'javascript') {
            throw new Error(
                `Script language ${scriptLanguage} not supported to be executed by JavascriptExecutionTools`,
            );
        }

        throw new Error('Not implemented');
    }
}

/**
 * TODO: !! Pass isVerbose to constructor and use it
 * TODO: !! Probbably make some common util createStatementToEvaluate
 * TODO: !! Implement via vm2
 */
