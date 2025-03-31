import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { $registeredLlmToolsMessage } from '../../llm-providers/_common/register/$registeredLlmToolsMessage';
import { $sideEffect } from '../../utils/organization/$sideEffect';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `list-models` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeListModelsCommand(program: Program) {
    const listModelsCommand = program.command('list-models');
    listModelsCommand.description(
        spaceTrim(`
            List all available and configured LLM models
        `),
    );

    listModelsCommand.alias('models');
    listModelsCommand.alias('llm');

    listModelsCommand.action(
        handleActionErrors(async (options) => {
            const llm = await $provideLlmToolsForCli({ ...options });
            $sideEffect(llm);
            // <- Note: Providing LLM tools will make a side effect of registering all available LLM tools to show the message

            console.info($registeredLlmToolsMessage());
            return process.exit(0);
        }),
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
