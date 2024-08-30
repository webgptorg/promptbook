import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { isValidFilePath } from '../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { KnowledgeCommand } from './KnowledgeCommand';

/**
 * Parses the knowledge command
 *
 * @see ./KNOWLEDGE-README.md for more details
 * @private within the commands folder
 */
export const knowledgeCommandParser: PipelineHeadCommandParser<KnowledgeCommand> = {
    /**
     * Name of the command
     */
    name: 'KNOWLEDGE',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: false, // <- [👙] Maybe allow to use here and make relevant for just this template

    /**
     * Description of the KNOWLEDGE command
     */
    description: `Tells promptbook which external knowledge to use`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/41',

    /**
     * Example usages of the KNOWLEDGE command
     */
    examples: [
        'KNOWLEDGE https://www.pavolhejny.com/',
        'KNOWLEDGE ./hejny-cv.txt',
        'KNOWLEDGE ./hejny-cv.md',
        'KNOWLEDGE ./hejny-cv.pdf',
        'KNOWLEDGE ./hejny-cv.docx',
    ],

    /**
     * Parses the KNOWLEDGE command
     */
    parse(input: CommandParserInput): KnowledgeCommand {
        const { args } = input;

        const sourceContent = spaceTrim(args[0] || '');

        if (sourceContent === '') {
            throw new ParseError(`Source is not defined`);
        }

        // TODO: !!!! Following checks should be applied every link in the `sourceContent`

        if (sourceContent.startsWith('http://')) {
            throw new ParseError(`Source is not secure`);
        }

        if (!(isValidFilePath(sourceContent) || isValidUrl(sourceContent))) {
            throw new ParseError(`Source not valid`);
        }

        if (sourceContent.startsWith('../') || sourceContent.startsWith('/') || /^[A-Z]:[\\/]+/i.test(sourceContent)) {
            throw new ParseError(`Source cannot be outside of the .ptbk.md folder`);
        }

        return {
            type: 'KNOWLEDGE',
            sourceContent,
        } satisfies KnowledgeCommand;
    },

    /**
     * Apply the KNOWLEDGE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: KnowledgeCommand, $pipelineJson: $PipelineJson): void {
        const { sourceContent } = command;

        const name = 'source-' + sha256(hexEncoder.parse(JSON.stringify(sourceContent))).toString(/* hex */);
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        //    <- TODO: This should be replaced with a better name later in preparation (done with some propper LLM summarization)

        $pipelineJson.knowledgeSources.push({
            name,
            sourceContent,
        });
    },

    /**
     * Converts the KNOWLEDGE command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: KnowledgeCommand): string_markdown_text {
        keepUnused(command);
        return `!!!!!!`;
    },

    /**
     * Reads the KNOWLEDGE command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<KnowledgeCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
