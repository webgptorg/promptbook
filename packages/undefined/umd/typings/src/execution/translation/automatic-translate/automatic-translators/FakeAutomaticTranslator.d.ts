import type { AutomaticTranslator } from './AutomaticTranslator';
export declare class FakeAutomaticTranslator implements AutomaticTranslator {
    constructor();
    translate(message: string): string;
}
