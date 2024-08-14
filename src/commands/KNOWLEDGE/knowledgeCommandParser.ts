import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import spaceTrim from 'spacetrim';
import { ParsingError } from '../../errors/ParsingError';
import { isValidFilePath } from '../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import type { ApplyToPipelineJsonSubjects, CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { KnowledgeCommand } from './KnowledgeCommand';

/**
 * Parses the knowledge command
 *
 * @see ./KNOWLEDGE-README.md for more details
 * @private within the commands folder
 */
export const knowledgeCommandParser: CommandParser<KnowledgeCommand> = {
    /**
     * Name of the command
     */
    name: 'KNOWLEDGE',

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD'],

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
            throw new ParsingError(`Source is not defined`);
        }

        // TODO: !!!! Following checks should be applied every link in the `sourceContent`

        if (sourceContent.startsWith('http://')) {
            throw new ParsingError(`Source is not secure`);
        }

        if (!(isValidFilePath(sourceContent) || isValidUrl(sourceContent))) {
            throw new ParsingError(`Source not valid`);
        }

        if (sourceContent.startsWith('../') || sourceContent.startsWith('/') || /^[A-Z]:[\\/]+/i.test(sourceContent)) {
            throw new ParsingError(`Source cannot be outside of the .ptbk.md folder`);
        }

        return {
            type: 'KNOWLEDGE',
            sourceContent,
        } satisfies KnowledgeCommand;
    },

    /**
     * Note: Prototype of [🍧] (remove this comment after full implementation)
     */
    applyToPipelineJson(personaCommand: KnowledgeCommand, subjects: ApplyToPipelineJsonSubjects): void {
        const { sourceContent } = personaCommand;
        const { pipelineJson } = subjects;

        const name = 'source-' + sha256(hexEncoder.parse(JSON.stringify(sourceContent))).toString(/* hex */);
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        //    <- TODO: This should be replaced with a better name later in preparation (done with some propper LLM summarization)

        pipelineJson.knowledgeSources.push({
            name,
            sourceContent,
        });
    },
};
