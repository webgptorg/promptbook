import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { $registeredScrapersMessage } from '../../scrapers/_common/register/$registeredScrapersMessage';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `list-scrapers` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeListScrapersCommand(program: Program): $side_effect {
    const listModelsCommand = program.command('list-scrapers');
    listModelsCommand.description(
        spaceTrim(`
            List all available and configured scrapers and executables
        `),
    );

    listModelsCommand.alias('scrapers');

    listModelsCommand.action(
        handleActionErrors(async () => {
            // TODO: [🌞] Do not allow on REMOTE_SERVER strategy

            const scrapers = await $provideScrapersForNode({});
            const executables = await $provideExecutablesForNode();

            console.info(
                spaceTrim(
                    (block) => `
                    ${block($registeredScrapersMessage(scrapers))}

                    All mime-types which can be scraped:
                    ${block(
                        Array.from(new Set(Object.values(scrapers).flatMap(({ metadata }) => metadata.mimeTypes)))
                            .map((mimeType, i) => `${i + 1}) ${mimeType}`)
                            .join('\n'),
                    )}

                    Available executables:
                    ${block(
                        Object.entries(executables)
                            .map(([name, path], i) => `${i + 1}) **${name}** ${path}`)
                            .join('\n'),
                    )}
                `,
                ),
            );
            return process.exit(0);
        }),
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
