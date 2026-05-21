import { spaceTrim } from 'spacetrim';
import type { Writable, WritableDeep } from 'type-fest';
import { sectionCommandParser } from '../../commands/SECTION/sectionCommandParser';
import { getParserForCommand } from '../../commands/_common/getParserForCommand';
import { parseCommand } from '../../commands/_common/parseCommand';
import type { $PipelineJson, $TaskJson, CommandBase, PipelineTaskCommandParser } from '../../commands/_common/types/CommandParser';
import { DEFAULT_TASK_TITLE } from '../../config';
import { ParseError } from '../../errors/ParseError';
import type { ScriptTaskJson } from '../../pipeline/PipelineJson/ScriptTaskJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { ScriptLanguage } from '../../types/ScriptLanguage';
import { SUPPORTED_SCRIPT_LANGUAGES } from '../../types/ScriptLanguage';
import { extractAllListItemsFromMarkdown } from '../../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../../utils/markdown/extractOneBlockFromMarkdown';
import type { MarkdownSection } from '../../utils/markdown/parseMarkdownSection';
import { extractParameterNamesFromTask } from '../utils/extractParameterNamesFromTask';
import type { UniqueSectionNameResolver } from './createUniqueSectionNameResolver';
import { defineParameter } from './defineParameter';
import { extractPipelineDescription } from './extractPipelineDescription';
import { getPipelineIdentification } from './getPipelineIdentification';

/**
 * Matches the trailing return statement of a task section.
 *
 * @private internal utility of `processPipelineSection`
 */
const RESULTING_PARAMETER_LINE_REGEXP = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im;

/**
 * One list-item command together with its original markdown source line.
 *
 * @private internal type of `processPipelineSection`
 */
type ParsedPipelineCommandItem = {
    readonly listItem: string;
    readonly command: ReturnType<typeof parseCommand>;
};

/**
 * Parses, applies, and persists one h2 task section.
 *
 * @private internal utility of `parsePipeline`
 */
export function processPipelineSection(
    pipelineSection: MarkdownSection,
    $pipelineJson: $PipelineJson,
    getUniqueSectionName: UniqueSectionNameResolver,
): void {
    const { $taskJson, language } = createTaskJsonFromSection(pipelineSection, getUniqueSectionName);
    const commands = parsePipelineTaskCommands(pipelineSection.content);

    applyDefaultTaskSectionType($taskJson, commands, $pipelineJson);

    for (const commandItem of commands) {
        applyPipelineTaskCommand(commandItem, $taskJson, $pipelineJson);
    }

    applyScriptTaskLanguage($taskJson, language, $pipelineJson);
    registerTaskDependentParameters($taskJson, $pipelineJson);
    persistTaskIfNeeded($taskJson, $pipelineJson);
}

/**
 * Creates the mutable task JSON shell from one markdown section.
 *
 * @private internal utility of `processPipelineSection`
 */
function createTaskJsonFromSection(
    pipelineSection: MarkdownSection,
    getUniqueSectionName: UniqueSectionNameResolver,
): { $taskJson: $TaskJson; language: string | undefined } {
    const { language, content } = extractOneBlockFromMarkdown(pipelineSection.content);
    const normalizedLanguage = language || undefined;
    const title = pipelineSection.title || DEFAULT_TASK_TITLE;
    const $taskJson: $TaskJson = {
        isSectionTypeSet: false,
        isTask: true,
        taskType: undefined /* <- Note: [🍙] Putting here placeholder to keep `taskType` on top at final JSON */,
        name: getUniqueSectionName(title),
        title,
        description: extractPipelineDescription(pipelineSection.content),
        content,
        // <- TODO: [🍙] Some standard order of properties
    };
    const resultingParameterName = extractResultingParameterName(pipelineSection.content);

    if (resultingParameterName !== undefined) {
        $taskJson.resultingParameterName = resultingParameterName;
    }

    return {
        $taskJson,
        language: normalizedLanguage,
    };
}

/**
 * Extracts the optional trailing `-> {parameter}` statement from a section body.
 *
 * @private internal utility of `processPipelineSection`
 */
function extractResultingParameterName(sectionContent: string): string | undefined {
    const lastLine = sectionContent.split(/\r?\n/).pop()!;
    const resultingParameterNameMatch = RESULTING_PARAMETER_LINE_REGEXP.exec(lastLine);

    return resultingParameterNameMatch?.groups?.resultingParamName;
}

/**
 * Parses all list-item commands declared inside one task section.
 *
 * @private internal utility of `processPipelineSection`
 */
function parsePipelineTaskCommands(sectionContent: string): Array<ParsedPipelineCommandItem> {
    return extractAllListItemsFromMarkdown(sectionContent).map((listItem) => ({
        listItem,
        command: parseCommand(listItem, 'PIPELINE_TASK'),
    }));
}

/**
 * Applies the implicit default `PROMPT_TASK` section type when no SECTION command is present.
 *
 * @private internal utility of `processPipelineSection`
 */
function applyDefaultTaskSectionType(
    $taskJson: $TaskJson,
    commands: ReadonlyArray<ParsedPipelineCommandItem>,
    $pipelineJson: $PipelineJson,
): void {
    const isSectionCommandPresent = commands.some(({ command }) => command.type === 'SECTION');

    if (isSectionCommandPresent) {
        return;
    }

    sectionCommandParser.$applyToTaskJson({ type: 'SECTION', taskType: 'PROMPT_TASK' }, $taskJson, $pipelineJson);
}

/**
 * Parses and applies one command declared inside a task section.
 *
 * @private internal utility of `processPipelineSection`
 */
function applyPipelineTaskCommand(
    commandItem: ParsedPipelineCommandItem,
    $taskJson: $TaskJson,
    $pipelineJson: $PipelineJson,
): void {
    const { listItem, command } = commandItem;
    const commandParser = getParserForCommand(command);

    if (commandParser.isUsedInPipelineTask !== true /* <- Note: [🦦][4] */) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Command \`${command.type}\` is not allowed in the task of the promptbook ONLY at the pipeline head

                    ${block(getPipelineIdentification($pipelineJson))}
                `,
            ),
        ); // <- TODO: [🚞]
    }

    try {
        (commandParser as PipelineTaskCommandParser<CommandBase>).$applyToTaskJson(command, $taskJson, $pipelineJson);
        //             <- Note: [🦦] Its strange that this assertion must be here, [🦦][4] should do this assertion implicitly
    } catch (error) {
        if (!(error instanceof ParseError)) {
            throw error;
        }

        throw new ParseError(
            spaceTrim(
                (block) => `
                    Command \`${command.type}\` failed to apply to the task

                    The error:
                    ${block((error as ParseError).message)}

                    Current state of the task:
                    ${block(JSON.stringify($taskJson, null, 4))}

                    Command that failed to apply:
                    ${block(JSON.stringify(command, null, 4))}

                    *<- Maybe wrong order of commands in section?*

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

/**
 * Validates and stores the language for SCRIPT tasks.
 *
 * @private internal utility of `processPipelineSection`
 */
function applyScriptTaskLanguage(
    $taskJson: $TaskJson,
    language: string | undefined,
    $pipelineJson: $PipelineJson,
): void {
    const isScriptTask = ($taskJson as WritableDeep<TaskJson>).taskType === 'SCRIPT_TASK';

    if (!isScriptTask) {
        return;
    }

    if (!language) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    You must specify the language of the script in the \`SCRIPT\` task

                    ${block(getPipelineIdentification($pipelineJson))}
                `,
            ),
            // <- TODO: [🚞]
        );
    }

    if (!SUPPORTED_SCRIPT_LANGUAGES.includes(language as ScriptLanguage)) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Script language ${language} is not supported.
                    Supported languages are:
                    ${block(SUPPORTED_SCRIPT_LANGUAGES.join(', '))}

                `,
                // <- TODO: [🚞]
            ),
        );
    }

    ($taskJson as Partial<$TaskJson> as Writable<ScriptTaskJson>).contentLanguage = language as ScriptLanguage;
}

/**
 * Extracts task dependencies and ensures referenced parameters exist.
 *
 * @private internal utility of `processPipelineSection`
 */
function registerTaskDependentParameters($taskJson: $TaskJson, $pipelineJson: $PipelineJson): void {
    $taskJson.dependentParameterNames = Array.from(
        extractParameterNamesFromTask(
            $taskJson as TaskJson,
            // <- TODO: [3]
        ),
    );

    for (const parameterName of $taskJson.dependentParameterNames) {
        // TODO: [🧠] This definition should be made first in the task
        defineParameter($pipelineJson, {
            parameterName,
            parameterDescription: null,
            isInput: false,
            isOutput: false,
            // <- Note: In this case null+false+false means that we do not know yet if it is input or output and we will set it later
        });
    }
}

/**
 * Removes transient parsing flags and persists real tasks into the pipeline JSON.
 *
 * @private internal utility of `processPipelineSection`
 */
function persistTaskIfNeeded($taskJson: $TaskJson, $pipelineJson: $PipelineJson): void {
    /*
    // TODO: [🍧] This should be checked in `MODEL` command + better error message
    if ($taskJson.taskType !== 'PROMPT_TASK' && $taskJson.modelRequirements !== undefined) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Model requirements are defined for the block type ${
                        $taskJson.taskType
                    } which is not a \`PROMPT\` task

                    This should be avoided by the \`modelCommandParser\`

                    ${block(getPipelineIdentification($pipelineJson))}
              `,
            ),
        );
    }
    */

    if (!$taskJson.isTask) {
        return;
    }

    delete ($taskJson as Partial<$TaskJson>).isSectionTypeSet;
    delete ($taskJson as Partial<$TaskJson>).isTask;

    // TODO: [🍙] Maybe do reorder of `$taskJson` here

    $pipelineJson.tasks.push(
        $taskJson as TaskJson,
        // <- TODO: [3] Do not do `as TaskJson` BUT make 100% sure that nothing is missing
    );
}
