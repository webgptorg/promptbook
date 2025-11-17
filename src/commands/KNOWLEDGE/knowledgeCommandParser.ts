import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import { isValidFilePath } from '../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import type { $PipelineJson, CommandParserInput, PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { KnowledgeCommand } from './KnowledgeCommand';
import { knowledgeSourceContentToName } from './utils/knowledgeSourceContentToName';

/**
 * Parses the knowledge command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
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
    isUsedInPipelineTask: false, // <- [👙] Maybe allow to use here and make relevant for just this task

    /**
     * Description of the KNOWLEDGE command
     */
    description: `Tells promptbook which external knowledge to use`,

    /**
     * Link to documentation
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
        //          <- TODO: [😿] Allow ONLY files scoped in the (sub)directory NOT ../ and test it
    ],

    /**
     * Parses the KNOWLEDGE command
     */
    parse(input: CommandParserInput): KnowledgeCommand {
        const { args } = input;

        const knowledgeSourceContent = spaceTrim(args[0] || '');

        if (knowledgeSourceContent === '') {
            throw new ParseError(`Source is not defined`);
        }

        // TODO: [main] !!4 Following checks should be applied every link in the `sourceContent`

        if (knowledgeSourceContent.startsWith('http://')) {
            throw new ParseError(`Source is not secure`);
        }

        if (!(isValidFilePath(knowledgeSourceContent) || isValidUrl(knowledgeSourceContent))) {
            throw new ParseError(`Source not valid`);
        }

        if (
            knowledgeSourceContent.startsWith('../') ||
            knowledgeSourceContent.startsWith('/') ||
            /^[A-Z]:[\\/]+/i.test(knowledgeSourceContent)
        ) {
            throw new ParseError(`Source cannot be outside of the .book.md folder`);
        }

        return {
            type: 'KNOWLEDGE',
            knowledgeSourceContent,
        } satisfies KnowledgeCommand;
    },

    /**
     * Apply the KNOWLEDGE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: KnowledgeCommand, $pipelineJson: $PipelineJson): $side_effect {
        const { knowledgeSourceContent } = command;

        $pipelineJson.knowledgeSources.push({
            name: knowledgeSourceContentToName(knowledgeSourceContent),
            knowledgeSourceContent,
        });
    },

    /**
     * Converts the KNOWLEDGE command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: KnowledgeCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the KNOWLEDGE command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<KnowledgeCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * Note: [⛱] There are two types of KNOWLEDGE commands *...(read more in [⛱])*
 */
