import type { Promisable } from 'type-fest';

/**
 * @private still in development [🏳]
 */
export type AutomaticTranslator = {
    translate(message: string): Promisable<string>;
};
