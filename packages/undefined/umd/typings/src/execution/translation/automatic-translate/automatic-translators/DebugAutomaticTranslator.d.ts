import type { AutomaticTranslator } from './AutomaticTranslator';
/**
 * This will wrap an automatic translator and log each translation into the console
 */
export declare class DebugAutomaticTranslator implements AutomaticTranslator {
    private readonly automaticTranslator;
    constructor(automaticTranslator: AutomaticTranslator);
    translate(message: string): Promise<string>;
}
