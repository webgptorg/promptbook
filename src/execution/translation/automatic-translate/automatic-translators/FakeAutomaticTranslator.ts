import type { AutomaticTranslator } from './AutomaticTranslator';

export class FakeAutomaticTranslator implements AutomaticTranslator {
    public constructor() {}

    public translate(message: string): string {
        return message;
    }
}
