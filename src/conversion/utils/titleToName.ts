import { basename } from 'path';
import { isValidUrl } from '../../_packages/utils.index';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { removeEmojis } from '../../utils/removeEmojis';
import { isValidFilePath } from '../../utils/validators/filePath/isValidFilePath';

/**
 * @@@
 *
 * @param value @@@
 * @returns @@@
 * @example @@@
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
