import { isValidPromptbookUrl } from '../../_packages/utils.index';
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

    /*
    Note: [🛵] No need for alias name because it is already preprocessed
    aliasNames: ['HTTPS'],
    */

    /*
    !!!!!!!! Probbably working
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
    examples: [
        'URL https://promptbook.studio/library/write-cv.ptbk.md',
        'https://promptbook.studio/library/write-cv.ptbk.md',
    ],

    /**
     * Parses the URL command
     */
    parse(input: CommandParserInput): UrlCommand {
        const { args } = input;

        const pipelineUrl = args.pop()!;

        if (pipelineUrl === undefined) {
            throw new SyntaxError(`URL is required`);
        }

        if (!isValidPromptbookUrl(pipelineUrl)) {
            throw new SyntaxError(`Invalid Promptbook URL "${pipelineUrl}"`);
        }

        if (args.length > 0) {
            throw new SyntaxError(`Can not have more than one Promptbook URL`);
        }

        /*
        TODO: [🐠 Maybe more info from `isValidPromptbookUrl`:
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
        */

        return {
            type: 'URL',
            pipelineUrl: new URL(pipelineUrl),
        } satisfies UrlCommand;
    },
};
