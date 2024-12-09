import type { Command as Program /* <- Note: Using Program because Command is misleading name */ } from 'commander';
import spaceTrim from 'spacetrim';
import { $registeredLlmToolsMessage } from '../../llm-providers/_common/register/$registeredLlmToolsMessage';

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
        console.info($registeredLlmToolsMessage());
        return process.exit(0);
    });
}
