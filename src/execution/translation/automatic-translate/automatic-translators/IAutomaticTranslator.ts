import { Promisable } from 'type-fest';

export interface IAutomaticTranslator {
    translate(message: string): Promisable<string>;
}
