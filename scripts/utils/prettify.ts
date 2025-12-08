import { readFile } from 'fs/promises';
import { join } from 'path';
import parserHtml from 'prettier/parser-html';
import parserMarkdown from 'prettier/parser-markdown';
import parserTypescript from 'prettier/parser-typescript';
import { format } from 'prettier/standalone';
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
        return format(fileContents, {
            parser,
            ...(JSON.parse(await readFile(join(process.cwd(), '.prettierrc'), 'utf-8')) as TODO_any),
            plugins: [
                parserMarkdown,
                parserHtml,
                parserTypescript /* <- TODO: Maybe add more parsers like `parserBabel` */,
            ],
        });
    } catch (error) {
        assertsError(error);

        console.error(error);
        return spaceTrim(
            (block) => `

                ${block(spaceTrim(fileContents))}

                /*
                TODO: ${'!'.repeat(3)} ${(error as Error).name} occurred during prettify:

                ${block((error as Error).message)}
                */

            `,
        );
    }
}

/**
 * TODO: Use fs/promises instead of fs
 * Note: [⚫] Code in this file should never be published in any package
 */
