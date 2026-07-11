import { spaceTrim } from 'spacetrim';
import { getParserForCommand } from '../../commands/_common/getParserForCommand';
import { parseCommand } from '../../commands/_common/parseCommand';
import type { $PipelineJson, CommandBase, PipelineHeadCommandParser } from '../../commands/_common/types/CommandParser';
import { ParseError } from '../../errors/ParseError';
import { extractAllListItemsFromMarkdown } from '../../utils/markdown/extractAllListItemsFromMarkdown';
import type { MarkdownSection } from '../../utils/markdown/parseMarkdownSection';
import { defineParameter } from './defineParameter';
import { extractPipelineDescription } from './extractPipelineDescription';
import { getPipelineIdentification } from './getPipelineIdentification';

/**
 * Applies the pipeline head title, description, and head-level commands.
 *
 * @private internal utility of `parsePipeline`
 */
export function applyPipelineHead(pipelineHead: MarkdownSection, $pipelineJson: $PipelineJson): void {
    $pipelineJson.title = pipelineHead.title;
    $pipelineJson.description = extractPipelineDescription(pipelineHead.content);

    for (const listItem of extractAllListItemsFromMarkdown(pipelineHead.content)) {
        applyPipelineHeadCommand(listItem, $pipelineJson);
    }
}

/**
 * Parses and applies one command declared in the pipeline head.
 *
 * @private internal utility of `applyPipelineHead`
 */
function applyPipelineHeadCommand(listItem: string, $pipelineJson: $PipelineJson): void {
    const command = parseCommand(listItem, 'PIPELINE_HEAD');
    const commandParser = getParserForCommand(command);

    if (commandParser.isUsedInPipelineHead !== true /* <- Note: [🦦][4] */) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Command \`${command.type}\` is not allowed in the head of the pipeline ONLY at the pipeline task

                    ${block(getPipelineIdentification($pipelineJson))}
                `,
            ),
        ); // <- TODO: [🚞]
    }

    try {
        (commandParser as PipelineHeadCommandParser<CommandBase>).$applyToPipelineJson(command, $pipelineJson);
        //             <- Note: [🦦] Its strange that this assertion must be here, [🦦][4] should do this assertion implicitly
    } catch (error) {
        if (!(error instanceof ParseError)) {
            throw error;
        }

        throw new ParseError(
            spaceTrim(
                (block) => `
                    Command ${command.type} failed to apply to the pipeline

                    The error:
                    ${block((error as ParseError).message)}

                    Raw command:
                    - ${listItem}

                    Usage of ${command.type}:
                    ${block(commandParser.examples.map((example) => `- ${example}`).join('\n'))}

                    ${block(getPipelineIdentification($pipelineJson))}
              `,
            ),
        ); // <- TODO: [🚞]
    }

    if (command.type === 'PARAMETER') {
        defineParameter($pipelineJson, command);
        // <- Note: [🍣]
    }
}
