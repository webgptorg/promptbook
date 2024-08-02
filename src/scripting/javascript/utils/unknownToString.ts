import { really_unknown } from '../../../utils/organization/really_unknown';

/**
 * Converts anything to string that can be used for debugging and logging
 *
 * @param value String value for logging
 * @private Internal util
 */
export function unknownToString(value: really_unknown): string {
    if (value === undefined) {
        return 'undefined';
    } else if (value === null) {
        return 'null';
    } else if (['number', 'string', 'boolean'].includes(typeof value)) {
        return typeof value + ' ' + value.toString();
    } else if (typeof value === 'object' && Array.isArray(value)) {
        return 'array containing [' + value.map((item) => unknownToString(item)).join(', ') + ']';
    } else if (typeof value === 'object') {
        // TODO: Maybe serialize the object
        return 'object';
    } else {
        return 'unknown (Search in promptbook code for [🔹])';
    }
}
