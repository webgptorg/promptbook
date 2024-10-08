import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { isValidPipelineUrl } from '../../utils/validators/url/isValidPipelineUrl';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { UrlCommand } from './UrlCommand';

/**
 * Parses the url command
 *
 * @see `documentationUrl` for more details
 * @private within the commands folder
 */
export const urlCommandParser: PipelineHeadCommandParser<UrlCommand> = {
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
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: false,

    /**
     * Description of the URL command
     */
    description: `Declares unique URL for the pipeline`,

    /**
     * Link to documentation
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
            throw new ParseError(`URL is required`);
        }

        // TODO: [🧠][🚲] This should be maybe tested as logic not parse
        if (!isValidPipelineUrl(pipelineUrl)) {
            throw new ParseError(`Invalid pipeline URL "${pipelineUrl}"`);
        }

        if (args.length > 0) {
            throw new ParseError(`Can not have more than one pipeline URL`);
        }

        /*
        TODO: [🐠 Maybe more info from `isValidPipelineUrl`:
        if (pipelineUrl.protocol !== 'https:') {
            throw new ParseError(`Protocol must be HTTPS`);
        }

        if (pipelineUrl.hash !== '') {
            throw new ParseError(
                spaceTrim(
                    `
                        URL must not contain hash
                        Hash is used for identification of the template in the pipeline
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
    $applyToPipelineJson(command: UrlCommand, $pipelineJson: $PipelineJson): void {
        $pipelineJson.pipelineUrl = command.pipelineUrl.href;
    },

    /**
     * Converts the URL command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: UrlCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the URL command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<UrlCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
