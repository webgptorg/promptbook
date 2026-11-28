import type { AutomaticTranslator } from './AutomaticTranslator';

/**
 * Still in development [🏳].
 *
 * @private
 */
export class FakeAutomaticTranslator implements AutomaticTranslator {
    public constructor() {}

    public translate(message: string): string {
        return message;
    }
}
