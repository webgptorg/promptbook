import spaceTrim from 'spacetrim';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { UrlCommand } from './UrlCommand';

/**
 * Parses the url command
 *
 * @see ./URL-README.md for more details
 * @private within the commands folder
 */
export const urlCommandParser: CommandParser<UrlCommand> = {
    /**
     * Name of the command
     */
    name: 'URL',

    /**
     * Aliases for the URL command
     */
    aliasNames: ['HTTPS'], // <- TODO: !!!!

    /*
      normalized.startsWith('URL') ||
      normalized.startsWith('PTBK_URL') ||
      normalized.startsWith('PTBKURL') ||
      normalized.startsWith('URL') ||
      normalized.startsWith('PIPELINEURL') ||
      normalized.startsWith('PROMPTBOOK_URL') ||
      normalized.startsWith('PROMPTBOOKURL') ||
      normalized.startsWith('HTTPS')
    */

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD'],

    /**
     * Description of the URL command
     */
    description: `Declares unique URL for the pipeline`,

    /**
     * Example usages of the URL command
     */
    examples: ['URL https://promptbook.studio/libraty/write-cv.ptbk.md'],

    /**
     * Parses the URL command
     */
    parse(input: CommandParserInput): UrlCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`URL command requires exactly one argument`);
        }

        const pipelineUrlString = args.pop()!;
        const pipelineUrl = new URL(pipelineUrlString);

        if (pipelineUrl.protocol !== 'https:') {
            throw new SyntaxError(`Protocol must be HTTPS`);
        }

        if (pipelineUrl.hash !== '') {
            throw new SyntaxError(
                spaceTrim(
                    `
                        URL must not contain hash
                        Hash is used for identification of the prompt template in the pipeline
                    `,
                ),
            );
        }

        return {
            type: 'URL',
            pipelineUrl,
        } satisfies UrlCommand;
    },
};
