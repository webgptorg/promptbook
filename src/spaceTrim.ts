import { spaceTrimNested } from './nesting/spaceTrimNested';
import { spaceTrimSimple } from './spaceTrimSimple';

/**
 * Trims string from all 4 sides
 *
 * @see https://github.com/hejny/spacetrim#usage
 */

export function spaceTrim(content: string): string;
export function spaceTrim(
    createContent: (block: (blockContent: string) => string) => string,
): string;
export async function spaceTrim(
    createContent: (block: (blockContent: string) => string) => Promise<string>,
): Promise<string>;
export function spaceTrim(
    contentOrcreateContent: any /* <- [0] */,
    /*
        Note: [0] Propper type instead of any is
        | string
        | ((
              block: (blockContent: string) => string,
          ) => string | Promise<string>),
    */
): string | Promise<string> {
    if (typeof contentOrcreateContent === 'string') {
        return spaceTrimSimple(contentOrcreateContent);
    } else if (typeof contentOrcreateContent === 'function') {
        return spaceTrimNested(contentOrcreateContent);
    } else {
        throw new Error(
            spaceTrim(`
              spaceTrim expected

          `),
        );
    }
}

/**
 *  TODO: Allow to change split char , char: RegExp = /\s/
 */
