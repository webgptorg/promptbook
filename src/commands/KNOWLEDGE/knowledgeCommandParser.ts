import { titleToName } from '../../conversion/utils/titleToName';
import { ParsingError } from '../../errors/ParsingError';
import { isValidFilePath } from '../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import type { ApplyToPipelineJsonSubjects } from '../_common/types/CommandParser';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
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

        const source = args[0];

        if (source === undefined) {
            throw new ParsingError(`Source is not defined`);
        }

        if (source.startsWith('http://')) {
            throw new ParsingError(`Source is not secure`);
        }

        if (!(isValidFilePath(source) || isValidUrl(source))) {
            throw new ParsingError(`Source not valid`);
        }

        if (source.startsWith('../') || source.startsWith('/') || /^[A-Z]:[\\/]+/i.test(source)) {
            throw new ParsingError(`Source cannot be outside of the .ptbk.md folder`);
        }

        return {
            type: 'KNOWLEDGE',
            source,
        } satisfies KnowledgeCommand;
    },

    /**
     * Note: Prototype of [🍧] (remove this comment after full implementation)
     */
    applyToPipelineJson(personaCommand: KnowledgeCommand, subjects: ApplyToPipelineJsonSubjects): void {
        const { source } = personaCommand;
        const { pipelineJson } = subjects;

        const name = titleToName(source);

        pipelineJson.knowledgeSources.push({
            name,
            source,
        });
    },
};
