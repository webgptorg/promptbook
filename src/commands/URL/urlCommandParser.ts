import { ParsingError } from '../../errors/ParsingError';
import { isValidPipelineUrl } from '../../utils/validators/url/isValidPipelineUrl';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { UrlCommand } from './UrlCommand';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';

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

    aliasNames: ['PIPELINE_URL'],

    /*
    Note: [🛵] No need for this alias name because it is already preprocessed
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
        'PIPELINE URL https://promptbook.studio/library/write-cv.ptbk.md',
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

    /**
     * Apply the URL command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: UrlCommand, pipelineJson: PipelineJson): void {
        keepUnused(command, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Apply the URL command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: UrlCommand, templateJson: PromptTemplateJson, pipelineJson: PipelineJson): void {
        keepUnused(command, templateJson, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Converts the URL command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: UrlCommand): string_markdown_text {
        return `- !!!!!!`;
    },

    /**
     * Reads the URL command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<UrlCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Reads the URL command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: PromptTemplateJson): Array<UrlCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
