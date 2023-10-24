import { readFile } from 'fs';
import { join } from 'path';
import prettier from 'prettier';
import spaceTrim from 'spacetrim';
import { promisify } from 'util';

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
            ...(JSON.parse(await promisify(readFile)(join(process.cwd(), '.prettierrc'), 'utf8')) as any),
        });
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        console.error(error);
        return spaceTrim(
            (block) => `

            ${block(spaceTrim(fileContents))}

            /*
                TODO: ${'!'}${'!'}${'!'} ${(error as Error).name} occurred during prettify:


                ${block((error as Error).message)}


            */

        `,
        );
    }
}

/**
 * TODO: !!! Use fs/promises instead of fs
 */
