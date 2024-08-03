import { ParsingError } from '../../errors/ParsingError';
import { isValidPipelineUrl } from '../../utils/validators/url/isValidPipelineUrl';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
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

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD'],

    /**
     * Description of the URL command
     */
    description: `Declares unique URL for the pipeline`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/70',

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
            throw new ParsingError(`URL is required`);
        }

        // TODO: [🧠][🚲] This should be maybe tested as logic not syntax
        if (!isValidPipelineUrl(pipelineUrl)) {
            throw new ParsingError(`Invalid pipeline URL "${pipelineUrl}"`);
        }

        if (args.length > 0) {
            throw new ParsingError(`Can not have more than one pipeline URL`);
        }

        /*
        TODO: [🐠 Maybe more info from `isValidPipelineUrl`:
        if (pipelineUrl.protocol !== 'https:') {
            throw new ParsingError(`Protocol must be HTTPS`);
        }

        if (pipelineUrl.hash !== '') {
            throw new ParsingError(
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
