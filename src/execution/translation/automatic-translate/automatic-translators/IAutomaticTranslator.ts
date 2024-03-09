import { Promisable } from 'type-fest';

export interface AutomaticTranslator {
    translate(message: string): Promisable<string>;
}
