import { spaceTrim } from 'spacetrim';
import type { Writable, WritableDeep } from 'type-fest';
import type { ParameterCommand } from '../commands/PARAMETER/ParameterCommand';
import { sectionCommandParser } from '../commands/SECTION/sectionCommandParser';
import { getParserForCommand } from '../commands/_common/getParserForCommand';
import { parseCommand } from '../commands/_common/parseCommand';
import type {
    $PipelineJson,
    $TaskJson,
    CommandBase,
    PipelineHeadCommandParser,
    PipelineTaskCommandParser,
} from '../commands/_common/types/CommandParser';
import { DEFAULT_BOOK_TITLE, DEFAULT_TASK_TITLE } from '../config';
import { ORDER_OF_PIPELINE_JSON, RESERVED_PARAMETER_NAMES } from '../constants';
import { ParseError } from '../errors/ParseError';
import { UnexpectedError } from '../errors/UnexpectedError';
import { HIGH_LEVEL_ABSTRACTIONS } from '../high-level-abstractions/index';
import type { ParameterJson } from '../pipeline/PipelineJson/ParameterJson';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { ScriptTaskJson } from '../pipeline/PipelineJson/ScriptTaskJson';
import type { TaskJson } from '../pipeline/PipelineJson/TaskJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { validatePipelineString } from '../pipeline/validatePipelineString';
import type { ScriptLanguage } from '../types/ScriptLanguage';
import { SUPPORTED_SCRIPT_LANGUAGES } from '../types/ScriptLanguage';
import type { number_integer, number_positive, string_name } from '../types/typeAliases';
import { deflatePipeline } from '../utils/editable/edit-pipeline-string/deflatePipeline';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { flattenMarkdown } from '../utils/markdown/flattenMarkdown';
import { parseMarkdownSection } from '../utils/markdown/parseMarkdownSection';
import { removeMarkdownComments } from '../utils/markdown/removeMarkdownComments';
import { splitMarkdownIntoSections } from '../utils/markdown/splitMarkdownIntoSections';
import { titleToName } from '../utils/normalization/titleToName';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { chococake } from '../utils/organization/really_any';
import { exportJson } from '../utils/serialization/exportJson';
import { extractParameterNamesFromTask } from './utils/extractParameterNamesFromTask';

/**
 * Compile pipeline from string (markdown) format to JSON format synchronously
 *
 * Note: There are 3 similar functions:
 * - `compilePipeline` **(preferred)** - which properly compiles the promptbook and uses embedding for external knowledge
 * - `parsePipeline` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * Note: This function does not validate logic of the pipeline only the parsing
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.book.md)
 * @returns {Promptbook} compiled in JSON format (.bookc)
 * @throws {ParseError} if the promptbook string is not valid
 * @public exported from `@promptbook/core`
 */
export function parsePipeline(pipelineString: PipelineString): PipelineJson {
    const $pipelineJson: $PipelineJson = {
        title: DEFAULT_BOOK_TITLE,
        parameters: [],
        tasks: [],
        knowledgeSources: [],
        knowledgePieces: [],
        personas: [],
        preparations: [],
        sources: [
            {
                type: 'BOOK',
                path: null,
                // <- TODO: !!6 Pass here path of the file
                content: pipelineString,
            },
        ],
    };

    function getPipelineIdentification() {
        // Note: This is a 😐 implementation of [🚞]
        const _: Array<string> = [];

        if ($pipelineJson.sourceFile !== undefined) {
            _.push(`File: ${$pipelineJson.sourceFile}`);
        }

        if ($pipelineJson.pipelineUrl !== undefined) {
            _.push(`Url: ${$pipelineJson.pipelineUrl}`);
        }

        return _.join('\n');
    }

    // =============================================================
    // Note: 1️⃣ Parsing of the markdown into object

    // ==============
    // Note: 1️⃣◽1️⃣ Remove #!shebang and comments
    if (pipelineString.startsWith('#!')) {
        const [shebangLine, ...restLines] = pipelineString.split(/\r?\n/);

        if (!(shebangLine || '').includes('ptbk')) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        It seems that you try to parse a book file which has non-standard shebang line for book files:
                        Shebang line must contain 'ptbk'

                        You have:
                        ${block(shebangLine || '(empty line)')}

                        It should look like this:
                        #!/usr/bin/env ptbk

                        ${block(getPipelineIdentification())}
                    `,
                ),
            );
        }
        pipelineString = validatePipelineString(restLines.join('\n'));
    }
    pipelineString = removeMarkdownComments(pipelineString);
    pipelineString = spaceTrim(pipelineString) as PipelineString;

    // <- TODO: [😧] `spaceTrim` should preserve discriminated type *(or at lease `PipelineString`)*
    pipelineString = deflatePipeline(pipelineString);

    // ==============
    // Note: 1️⃣◽2️⃣ Parse the markdown
    pipelineString = flattenMarkdown(pipelineString) /* <- Note: [🥞] */;
    pipelineString = pipelineString.replaceAll(
        /`\{(?<parameterName>[a-z0-9_]+)\}`/gi,
        '{$<parameterName>}',
    ) as PipelineString;
    pipelineString = pipelineString.replaceAll(
        /`->\s+\{(?<parameterName>[a-z0-9_]+)\}`/gi,
        '-> {$<parameterName>}',
    ) as PipelineString;
    const [pipelineHead, ...pipelineSections] =
        splitMarkdownIntoSections(pipelineString).map(parseMarkdownSection); /* <- Note: [🥞] */

    // ==============
    // Note: 1️⃣◽4️⃣ Check markdown structure
    if (pipelineHead === undefined) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Pipeline head is not defined

                    ${block(getPipelineIdentification())}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }
    if (pipelineHead.level !== 1) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Pipeline head is not h1

                    ${block(getPipelineIdentification())}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }
    if (!pipelineSections.every((section) => section.level === 2)) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Not every pipeline section is h2

                    ${block(getPipelineIdentification())}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }

    // =============================================================
    ///Note: 2️⃣ Function for defining parameters
    const defineParam = (parameterCommand: Omit<ParameterCommand, 'type'>) => {
        const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

        if (RESERVED_PARAMETER_NAMES.includes(parameterName as chococake)) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Parameter name {${parameterName}} is reserved and cannot be used as resulting parameter name

                        ${block(getPipelineIdentification())}
                    `,
                ) /* <- TODO: [🚞] */,
            );
        }

        const existingParameter = $pipelineJson.parameters.find(
            (parameter: ParameterJson) => parameter.name === parameterName,
        );
        if (
            existingParameter &&
            existingParameter.description &&
            existingParameter.description !== parameterDescription &&
            parameterDescription
        ) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Parameter \`{${parameterName}}\` is defined multiple times with different description:

                        ${block(getPipelineIdentification())}

                        First definition:
                        ${block(existingParameter.description || '[undefined]')}

                        Second definition:
                        ${block(parameterDescription || '[undefined]')}
                    `, // <- TODO: [🚞]
                ),
            );
        }

        if (existingParameter) {
            if (parameterDescription) {
                existingParameter.description = parameterDescription;
            }

            existingParameter.isInput = existingParameter.isInput || isInput;
            existingParameter.isOutput = existingParameter.isOutput || isOutput;
        } else {
            $pipelineJson.parameters.push(
                {
                    name: parameterName,
                    description: parameterDescription || undefined,
                    isInput,
                    isOutput,
                } as ParameterJson,
                // <- Note: This type assertion is safe, only conflict is that in type definition `isInput` and `isOutput` cannot be both true
                //          but in this implementation it is possible, but it is not a problem it just does not make sense and its checked in [🆑] logic validaton
            );
        }
    };

    // =============================================================
    // Note: 3️⃣ Process pipeline head

    $pipelineJson.title = pipelineHead.title;

    // TODO: [🎾][1] DRY description
    let description: string | undefined = pipelineHead.content;

    // Note: Remove codeblocks - TODO: [🎾] Make util removeAllBlocksFromMarkdown (exported from `@promptbool/utils`)
    description = description.split(/^```.*^```/gms).join('');
    description = description.split(/^>.*$/gm).join('');

    //Note: Remove lists and return statement - TODO: [🎾] Make util  (exported from `@promptbool/utils`)
    description = description.split(/^(?:(?:-)|(?:\d\))|(?:`?->))\s+.*$/gm).join('');

    description = spaceTrim(description);

    if (description === '') {
        description = undefined;
    }
    $pipelineJson.description = description;

    const listItems = extractAllListItemsFromMarkdown(pipelineHead.content);
    for (const listItem of listItems) {
        // TODO: [🥥] Maybe move this logic to `$parseAndApplyPipelineHeadCommands`
        const command = parseCommand(listItem, 'PIPELINE_HEAD');

        const commandParser = getParserForCommand(command);

        if (commandParser.isUsedInPipelineHead !== true /* <- Note: [🦦][4] */) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Command \`${command.type}\` is not allowed in the head of the pipeline ONLY at the pipeline task

                        ${block(getPipelineIdentification())}
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

                        ${block(getPipelineIdentification())}
                  `,
                ),
            ); // <- TODO: [🚞]
        }

        if (command.type === 'PARAMETER') {
            defineParam(command);
            // <- Note: [🍣]
        }
    }

    // =============================================================
    // Note: 4️⃣ Prepare unique section names with indexes when needed

    const sectionCounts: Record<
        string_name,
        { count: number_integer & number_positive; currentIndex: number_integer & number_positive }
    > = {};

    for (const section of pipelineSections) {
        const name = titleToName(section.title);

        if (sectionCounts[name] === undefined) {
            sectionCounts[name] = { count: 0, currentIndex: 0 };
        }

        sectionCounts[name]!.count++;
    }

    const getUniqueSectionName = (title: string) => {
        const name = titleToName(title);
        const count = sectionCounts[name]!;

        if (count.count === 1) {
            return name;
        }

        const nameWithSuffix = `${name}-${count.currentIndex}`;
        count.currentIndex++;

        return nameWithSuffix;
    };

    // =============================================================
    // Note: 5️⃣ Process each section of the pipeline
    for (const section of pipelineSections) {
        // TODO: Parse section's description (the content out of the codeblock and lists)

        const listItems = extractAllListItemsFromMarkdown(section.content);

        const { language, content } = extractOneBlockFromMarkdown(section.content);

        // TODO: [🎾][1] DRY description
        let description: string | undefined = section.content;

        // Note: Remove codeblocks - TODO: [🎾]
        description = description.split(/^```.*^```/gms).join('');
        description = description.split(/^>.*$/gm).join('');

        //Note: Remove lists and return statement - TODO: [🎾]
        description = description.split(/^(?:(?:-)|(?:\d\))|(?:`?->))\s+.*$/gm).join('');

        description = spaceTrim(description);

        if (description === '') {
            description = undefined;
        }

        const $taskJson: $TaskJson = {
            isSectionTypeSet: false,
            isTask: true,
            taskType: undefined /* <- Note: [🍙] Putting here placeholder to keep `taskType` on top at final JSON */,
            name: getUniqueSectionName(section.title || DEFAULT_TASK_TITLE),
            title: section.title || DEFAULT_TASK_TITLE,
            description,
            content,
            // <- TODO: [🍙] Some standard order of properties
        };

        const lastLine = section.content.split(/\r?\n/).pop()!;
        const resultingParameterNameMatch = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im.exec(lastLine);
        if (
            resultingParameterNameMatch &&
            resultingParameterNameMatch.groups !== undefined &&
            resultingParameterNameMatch.groups.resultingParamName !== undefined
        ) {
            $taskJson.resultingParameterName = resultingParameterNameMatch.groups.resultingParamName;
        }

        // TODO: [🥥] Maybe move this logic to `$parseAndApplyPipelineTaskCommands`
        const commands = listItems.map((listItem) => ({
            listItem,
            command: parseCommand(listItem, 'PIPELINE_TASK'),
        }));

        // Note: If block type is not set, set it to 'PROMPT_TASK'
        if (commands.some(({ command }) => command.type === 'SECTION') === false) {
            sectionCommandParser.$applyToTaskJson(
                { type: 'SECTION', taskType: 'PROMPT_TASK' },
                $taskJson,
                $pipelineJson,
            );
        }

        // TODO [♓️] List commands and before apply order them to achieve order-agnostic commands

        for (const { listItem, command } of commands) {
            const commandParser = getParserForCommand(command);

            if (commandParser.isUsedInPipelineTask !== true /* <- Note: [🦦][4] */) {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            Command \`${
                                command.type
                            }\` is not allowed in the task of the promptbook ONLY at the pipeline head

                            ${block(getPipelineIdentification())}
                        `,
                    ),
                ); // <- TODO: [🚞]
            }

            try {
                (commandParser as PipelineTaskCommandParser<CommandBase>).$applyToTaskJson(
                    //            <- Note: [🦦] Its strange that this assertion must be here, [🦦][4] should do this assertion implicitly
                    command,
                    $taskJson,
                    $pipelineJson,
                );
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

                            ${block(getPipelineIdentification())}
                      `,
                    ),
                ); // <- TODO: [🚞]
            }

            if (command.type === 'PARAMETER') {
                defineParam(command);
                // <- Note: [🍣]
            }
        }

        // TODO: [🍧] Should be done in SECTION command
        if (($taskJson as WritableDeep<TaskJson>).taskType === 'SCRIPT_TASK') {
            if (!language) {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            You must specify the language of the script in the \`SCRIPT\` task

                            ${block(getPipelineIdentification())}
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

        $taskJson.dependentParameterNames = Array.from(
            extractParameterNamesFromTask(
                $taskJson as TaskJson,
                // <- TODO: [3]
            ),
        );

        for (const parameterName of $taskJson.dependentParameterNames) {
            // TODO: [🧠] This definition should be made first in the task
            defineParam({
                parameterName,
                parameterDescription: null,
                isInput: false,
                isOutput: false,
                // <- Note: In this case null+false+false means that we do not know yet if it is input or output and we will set it later
            });
        }

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

                        ${block(getPipelineIdentification())}
                  `,
                ),
            );
        }
        */

        if ($taskJson.isTask) {
            delete ($taskJson as Partial<$TaskJson>).isSectionTypeSet;
            delete ($taskJson as Partial<$TaskJson>).isTask;

            // TODO: [🍙] Maybe do reorder of `$taskJson` here

            $pipelineJson.tasks.push(
                $taskJson as TaskJson,
                // <- TODO: [3] Do not do `as TaskJson` BUT make 100% sure that nothing is missing
            );
        }
    }

    // =============================================================
    // Note: 6️⃣ Mark parameters as INPUT if not explicitly set
    if ($pipelineJson.parameters.every((parameter) => !parameter.isInput)) {
        for (const parameter of $pipelineJson.parameters) {
            const isThisParameterResulting = $pipelineJson.tasks.some(
                (task) => task.resultingParameterName === parameter.name,
            );
            if (!isThisParameterResulting) {
                parameter.isInput = true as TODO_any;
                // <- TODO: [💔] Why this is making typescript error in vscode but not in cli
                //        > Type 'true' is not assignable to type 'false'.ts(2322)
                //        > (property) isInput: false
                //        > The parameter is input of the pipeline The parameter is NOT input of the pipeline
            }
        }
    }

    // =============================================================
    // Note: 7️⃣ Mark all non-INPUT parameters as OUTPUT if any OUTPUT is not set
    if ($pipelineJson.parameters.every((parameter) => !parameter.isOutput)) {
        for (const parameter of $pipelineJson.parameters) {
            if (!parameter.isInput) {
                parameter.isOutput = true as TODO_any;
                // <- TODO: [💔]
            }
        }
    }

    // =============================================================
    // Note: 8️⃣ Cleanup of undefined values
    $pipelineJson.tasks.forEach((tasks) => {
        for (const [key, value] of Object.entries(tasks)) {
            if (value === undefined) {
                delete (tasks as chococake)[key];
            }
        }
    });
    $pipelineJson.parameters.forEach((parameter) => {
        for (const [key, value] of Object.entries(parameter)) {
            if (value === undefined) {
                delete (parameter as chococake)[key];
            }
        }
    });

    // =============================================================
    // Note: 9️⃣ Apply sync high-level abstractions
    for (const highLevelAbstraction of HIGH_LEVEL_ABSTRACTIONS.filter(({ type }) => type === 'SYNC')) {
        highLevelAbstraction.$applyToPipelineJson($pipelineJson);
    }

    // =============================================================
    // Note: 🔟 Default formfactor
    // Note: [🔆] If formfactor is still not set, set it to 'GENERIC'
    if ($pipelineJson.formfactorName === undefined) {
        $pipelineJson.formfactorName = 'GENERIC';
    }

    // =============================================================

    return exportJson({
        name: 'pipelineJson',
        message: `Result of \`parsePipeline\``,
        order: ORDER_OF_PIPELINE_JSON,
        value: {
            formfactorName: 'GENERIC',
            // <- Note: [🔆] Setting `formfactorName` is redundant to satisfy the typescript

            ...($pipelineJson as $PipelineJson),
        },
    });
}

/**
 * TODO: [🧠] Maybe more things here can be refactored as high-level abstractions
 * TODO: [main] !!4 Warn if used only sync version
 * TODO: [🚞] Report here line/column of error
 * TODO: Use spaceTrim more effectively
 * TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
 * TODO: [🥞] Not optimal parsing because `splitMarkdownIntoSections` is executed twice with same string, once through `flattenMarkdown` and second directly here
 * TODO: [♈] Probably move expectations from tasks to parameters
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🍙] Make some standard order of json properties
 */
