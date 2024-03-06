import chalk from 'chalk';
import { IAutomaticTranslator } from './IAutomaticTranslator';

/**
 * This will wrap an automatic translator and log each translation into the console
 */
export class DebugAutomaticTranslator implements IAutomaticTranslator {
    public constructor(private readonly automaticTranslator: IAutomaticTranslator) {}

    public async translate(message: string): Promise<string> {
        const messageTranslated = await this.automaticTranslator.translate(message);

        // TODO: Write by "" only if needed
        console.log(chalk.green(`"${message}" → "${messageTranslated}"`));

        return messageTranslated;
    }
}
