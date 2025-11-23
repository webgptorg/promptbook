import { basename } from 'path';
import { isValidFilePath } from '../validators/filePath/isValidFilePath';
import { isValidUrl } from '../validators/url/isValidUrl';
import { normalizeToKebabCase } from './normalize-to-kebab-case';
import { removeEmojis } from './removeEmojis';

/**
 * Converts a title string into a normalized name.
 *
 * Note: [🔂] This function is idempotent.
 *
 * @param value The title string to be converted to a name.
 * @returns A normalized name derived from the input title.
 * @example 'Hello World!' -> 'hello-world'
 * @public exported from `@promptbook/utils`
 */
export function titleToName(value: string): string {
    if (isValidUrl(value)) {
        value = value.replace(/^https?:\/\//, '');
        value = value.replace(/\.html$/, '');
    } else if (isValidFilePath(value)) {
        value = basename(value);
        // Note: Keeping extension in the name
    }

    value = value.split('/').join('-');

    value = removeEmojis(value);
    value = normalizeToKebabCase(value);

    // TODO: [🧠] Maybe warn or add some padding to short name which are not good identifiers
    return value;
}
