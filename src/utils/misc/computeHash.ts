import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { spaceTrim } from 'spacetrim';
import type { string_sha256 } from '../../types/string_sha256';
import type { really_unknown } from '../organization/really_unknown';
import { valueToString } from '../parameters/valueToString';

/**
 * Computes SHA-256 hash of the given object
 *
 * @public exported from `@promptbook/utils`
 */
export function computeHash(value: really_unknown): string_sha256 {
    return sha256(hexEncoder.parse(spaceTrim(valueToString(value)))).toString(/* hex */);
}

// TODO: [🥬][🥬] Use this ACRY
