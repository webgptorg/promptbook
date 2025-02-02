import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { $provideExecutablesForNode, $provideScrapersForNode } from '../../_packages/node.index';
import { $registeredScrapersMessage } from '../../scrapers/_common/register/$registeredScrapersMessage';

/**
 * Initializes `list-scrapers` command for Promptbook CLI utilities
 *
 * @private internal function of `promptbookCli`
 */
export function initializeListScrapersCommand(program: Program) {
    const listModelsCommand = program.command('list-scrapers');
    listModelsCommand.description(
        spaceTrim(`
            List all available and configured scrapers and executables
      `),
    );

    listModelsCommand.action(async () => {
        const scrapers = await $provideScrapersForNode({});
        const executables = await $provideExecutablesForNode();

        console.info(
            spaceTrim(
                (block) => `
                    ${block($registeredScrapersMessage(scrapers))}

                    Available executables:
                    ${Object.entries(executables)
                        .map(([name, path], i) => `${i + 1}) **${name}** ${path}`)
                        .join('\n')}
                `,
            ),
        );
        return process.exit(0);
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
