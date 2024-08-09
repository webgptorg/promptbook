import type { AutomaticTranslator } from './AutomaticTranslator';

/**
 * @private still in development [🏳]
 */
export class FakeAutomaticTranslator implements AutomaticTranslator {
    public constructor() {}

    public translate(message: string): string {
        return message;
    }
}
