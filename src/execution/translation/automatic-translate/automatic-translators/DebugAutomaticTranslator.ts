import { AutomaticTranslator } from './AutomaticTranslator';

/**
 * This will wrap an automatic translator and log each translation into the console
 */
export class DebugAutomaticTranslator implements AutomaticTranslator {
    public constructor(private readonly automaticTranslator: AutomaticTranslator) {}

    public async translate(message: string): Promise<string> {
        const messageTranslated = await this.automaticTranslator.translate(message);

        // TODO: Write by "" only if needed
        console.log((`"${message}" → "${messageTranslated}"`));

        return messageTranslated;
    }
}
