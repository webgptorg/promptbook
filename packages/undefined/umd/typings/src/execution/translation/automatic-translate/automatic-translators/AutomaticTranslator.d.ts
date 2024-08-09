import type { Promisable } from 'type-fest';
export type AutomaticTranslator = {
    translate(message: string): Promisable<string>;
};
