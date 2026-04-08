import type { Promisable } from 'type-fest';

/**
 * Still in development [🏳].
 *
 * @private
 */
export type AutomaticTranslator = {
    translate(message: string): Promisable<string>;
};
