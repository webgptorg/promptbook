import { readFile } from 'fs/promises';
import { join } from 'path';
import prettier from 'prettier';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../src/errors/assertsError';
import { TODO_any } from '../../src/utils/organization/TODO_any';

/**
 * Prettifies a file
 *
 * @param fileContents Contents of the file to prettify
 * @param parser language of parser to use
 * @returns Prettified file contents
 */
export async function prettify(fileContents: string, parser = 'typescript'): Promise<string> {
    try {
        return prettier.format(fileContents, {
            parser,
            ...(JSON.parse(await readFile(join(process.cwd(), '.prettierrc'), 'utf-8')) as TODO_any),
        });
    } catch (error) {
        assertsError(error);

        console.error(error);
        return spaceTrim(
            (block) => `

            ${block(spaceTrim(fileContents))}

            /*
                TODO: ${'!'}${'!'}${'!'} ${error.name} occurred during prettify:


                ${block(error.message)}


            */

        `,
        );
    }
}

/**
 * TODO: Use fs/promises instead of fs
 * Note: [⚫] Code in this file should never be published in any package
 */
