import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import spaceTrim from 'spacetrim';
import { $provideLlmToolsForCli } from '../../llm-providers/_common/register/$provideLlmToolsForCli';
import { $registeredLlmToolsMessage } from '../../llm-providers/_common/register/$registeredLlmToolsMessage';
import { keepUnused } from '../../utils/organization/keepUnused';

/**
 * Initializes `list-models` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeListModelsCommand(program: Program) {
    const listModelsCommand = program.command('list-models');
    listModelsCommand.description(
        spaceTrim(`
            List all available and configured LLM models
      `),
    );

    listModelsCommand.action(async () => {
        const llm = $provideLlmToolsForCli({});
        keepUnused(llm);
        // <- Note: Providing LLM tools will make a side effect of registering all available LLM tools to show the message

        console.info($registeredLlmToolsMessage());
        return process.exit(0);
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
