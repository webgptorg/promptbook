import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import type { AutomaticTranslator } from './AutomaticTranslator';

/**
 * This will wrap an automatic translator and log each translation into the console
 *
 * @private still in development [🏳]
 */
export class DebugAutomaticTranslator implements AutomaticTranslator {
    public constructor(private readonly automaticTranslator: AutomaticTranslator) {}

    public async translate(message: string): Promise<string> {
        const messageTranslated = await this.automaticTranslator.translate(message);

        // TODO: Write by "" only if needed
        console.log(colors.green(`"${message}" → "${messageTranslated}"`));

        return messageTranslated;
    }
}
