import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { removeEmojis } from '../../utils/removeEmojis';

/**
 * @@@
 *
 * @param value @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
export function titleToName(value: string): string {
    if (value.startsWith('http://') || value.startsWith('https://')) {
        value = value.replace(/^https?:\/\//, '');
        value = value.replace(/\.html$/, '');
    }

    if (value.startsWith('./') || value.startsWith('../')) {
        value = value.replace(/^\.\//, '');
    }

    value = value.split('/').join('-');

    value = removeEmojis(value);
    value = normalizeToKebabCase(value);

    // TODO: [🧠] Maybe warn or add some padding to short name which are not good identifiers
    return value;
}
