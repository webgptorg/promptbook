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
import type { number_integer, number_positive } from '../types/number_positive';
import type { ScriptLanguage } from '../types/ScriptLanguage';
import { SUPPORTED_SCRIPT_LANGUAGES } from '../types/ScriptLanguage';
import type { string_name } from '../types/string_name';
import { deflatePipeline } from '../utils/editable/edit-pipeline-string/deflatePipeline';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { flattenMarkdown } from '../utils/markdown/flattenMarkdown';
import type { MarkdownSection } from '../utils/markdown/parseMarkdownSection';
import { parseMarkdownSection } from '../utils/markdown/parseMarkdownSection';
import { removeMarkdownComments } from '../utils/markdown/removeMarkdownComments';
import { splitMarkdownIntoSections } from '../utils/markdown/splitMarkdownIntoSections';
import { titleToName } from '../utils/normalization/titleToName';
import type { chococake } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import { exportJson } from '../utils/serialization/exportJson';
import { extractParameterNamesFromTask } from './utils/extractParameterNamesFromTask';

/**
 * Normalizes inline parameter mentions wrapped in code spans before markdown flattening.
 *
 * @private internal utility of `parsePipeline`
 */
const INLINE_CODE_PARAMETER_REGEXP = /`\{(?<parameterName>[a-z0-9_]+)\}`/gi;

/**
 * Normalizes inline return statements wrapped in code spans before markdown flattening.
 *
 * @private internal utility of `parsePipeline`
 */
const INLINE_CODE_RETURN_PARAMETER_REGEXP = /`->\s+\{(?<parameterName>[a-z0-9_]+)\}`/gi;

/**
 * Matches the trailing return statement of a task section.
 *
 * @private internal utility of `parsePipeline`
 */
const RESULTING_PARAMETER_LINE_REGEXP = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im;

/**
 * Removes fenced code blocks when deriving human-readable section descriptions.
 *
 * @private internal utility of `parsePipeline`
 */
const DESCRIPTION_CODE_BLOCK_REGEXP = /^```.*^```/gms;

/**
 * Removes blockquote lines when deriving human-readable section descriptions.
 *
 * @private internal utility of `parsePipeline`
 */
const DESCRIPTION_BLOCKQUOTE_REGEXP = /^>.*$/gm;

/**
 * Removes list items and return statements when deriving human-readable section descriptions.
 *
 * @private internal utility of `parsePipeline`
 */
const DESCRIPTION_LIST_ITEM_REGEXP = /^(?:(?:-)|(?:\d\))|(?:`?->))\s+.*$/gm;

/**
 * Parsed markdown structure split into the pipeline head and task sections.
 *
 * @private internal utility of `parsePipeline`
 */
type ParsedPipelineSections = {
    readonly pipelineHead: MarkdownSection;
    readonly pipelineSections: ReadonlyArray<MarkdownSection>;
};

/**
 * One list-item command together with its original markdown source line.
 *
 * @private internal utility of `parsePipeline`
 */
type ParsedPipelineCommandItem = {
    readonly listItem: string;
    readonly command: ReturnType<typeof parseCommand>;
};

/**
 * Resolves a unique task name for one parsed markdown section title.
 *
 * @private internal utility of `parsePipeline`
 */
type UniqueSectionNameResolver = (title: string) => string_name;

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
 *
 * @public exported from `@promptbook/core`
 */
export function parsePipeline(pipelineString: PipelineString): PipelineJson {
    const $pipelineJson = createInitialPipelineJson(pipelineString);
    const preparedPipelineString = preparePipelineString(pipelineString, $pipelineJson);
    const { pipelineHead, pipelineSections } = parsePreparedPipelineSections(preparedPipelineString, $pipelineJson);
    const getUniqueSectionName = createUniqueSectionNameResolver(pipelineSections);

    applyPipelineHead(pipelineHead, $pipelineJson);

    for (const pipelineSection of pipelineSections) {
        processPipelineSection(pipelineSection, $pipelineJson, getUniqueSectionName);
    }

    applyImplicitParameterDirections($pipelineJson);
    removeUndefinedValuesFromPipeline($pipelineJson);
    applySyncHighLevelAbstractions($pipelineJson);
    ensurePipelineFormfactor($pipelineJson);

    return exportParsedPipelineJson($pipelineJson);
}

/**
 * Creates the mutable pipeline JSON structure used throughout parsing.
 *
 * @private internal utility of `parsePipeline`
 */
function createInitialPipelineJson(pipelineString: PipelineString): $PipelineJson {
    return {
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
}

/**
 * Builds a short file/url identification block for parse errors.
 *
 * @private internal utility of `parsePipeline`
 */
function getPipelineIdentification($pipelineJson: $PipelineJson): string {
    // Note: This is a 😐 implementation of [🚞]
    const pipelineIdentificationParts: Array<string> = [];

    if ($pipelineJson.sourceFile !== undefined) {
        pipelineIdentificationParts.push(`File: ${$pipelineJson.sourceFile}`);
    }

    if ($pipelineJson.pipelineUrl !== undefined) {
        pipelineIdentificationParts.push(`Url: ${$pipelineJson.pipelineUrl}`);
    }

    return pipelineIdentificationParts.join('\n');
}

/**
 * Removes shebang/comments and normalizes markdown into a parseable pipeline form.
 *
 * @private internal utility of `parsePipeline`
 */
function preparePipelineString(pipelineString: PipelineString, $pipelineJson: $PipelineJson): PipelineString {
    pipelineString = removePipelineShebang(pipelineString, $pipelineJson);
    pipelineString = removeMarkdownComments(pipelineString);
    pipelineString = spaceTrim(pipelineString) as PipelineString;

    // <- TODO: [😧] `spaceTrim` should preserve discriminated type *(or at lease `PipelineString`)*
    pipelineString = deflatePipeline(pipelineString);
    pipelineString = flattenMarkdown(pipelineString) as PipelineString;
    pipelineString = pipelineString.replaceAll(INLINE_CODE_PARAMETER_REGEXP, '{$<parameterName>}') as PipelineString;
    pipelineString = pipelineString.replaceAll(
        INLINE_CODE_RETURN_PARAMETER_REGEXP,
        '-> {$<parameterName>}',
    ) as PipelineString;

    return pipelineString;
}

/**
 * Validates and removes the optional `#!` shebang line for `.book` files.
 *
 * @private internal utility of `parsePipeline`
 */
function removePipelineShebang(pipelineString: PipelineString, $pipelineJson: $PipelineJson): PipelineString {
    if (!pipelineString.startsWith('#!')) {
        return pipelineString;
    }

    const [shebangLine, ...restLines] = pipelineString.split(/\r?\n/);
    const isBookShebang = (shebangLine || '').includes('ptbk');

    if (!isBookShebang) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    It seems that you try to parse a book file which has non-standard shebang line for book files:
                    Shebang line must contain 'ptbk'

                    You have:
                    ${block(shebangLine || '(empty line)')}

                    It should look like this:
                    #!/usr/bin/env ptbk

                    ${block(getPipelineIdentification($pipelineJson))}
                `,
            ),
        );
    }

    return validatePipelineString(restLines.join('\n'));
}

/**
 * Splits the prepared markdown into the pipeline head and task sections.
 *
 * @private internal utility of `parsePipeline`
 */
function parsePreparedPipelineSections(
    pipelineString: PipelineString,
    $pipelineJson: $PipelineJson,
): ParsedPipelineSections {
    const [pipelineHead, ...pipelineSections] =
        splitMarkdownIntoSections(pipelineString).map(parseMarkdownSection); /* <- Note: [🥞] */

    assertPipelineSectionsStructure(pipelineHead, pipelineSections, $pipelineJson);

    return {
        pipelineHead,
        pipelineSections,
    };
}

/**
 * Ensures the flattened markdown has exactly one h1 head followed by only h2 sections.
 *
 * @private internal utility of `parsePipeline`
 */
function assertPipelineSectionsStructure(
    pipelineHead: MarkdownSection | undefined,
    pipelineSections: ReadonlyArray<MarkdownSection>,
    $pipelineJson: $PipelineJson,
): asserts pipelineHead is MarkdownSection {
    if (pipelineHead === undefined) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Pipeline head is not defined

                    ${block(getPipelineIdentification($pipelineJson))}

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

                    ${block(getPipelineIdentification($pipelineJson))}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }

    if (!pipelineSections.every((pipelineSection) => pipelineSection.level === 2)) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Not every pipeline section is h2

                    ${block(getPipelineIdentification($pipelineJson))}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }
}

/**
 * Applies the pipeline head title, description, and head-level commands.
 *
 * @private internal utility of `parsePipeline`
 */
function applyPipelineHead(pipelineHead: MarkdownSection, $pipelineJson: $PipelineJson): void {
    $pipelineJson.title = pipelineHead.title;
    $pipelineJson.description = extractPipelineDescription(pipelineHead.content);

    for (const listItem of extractAllListItemsFromMarkdown(pipelineHead.content)) {
        applyPipelineHeadCommand(listItem, $pipelineJson);
    }
}

/**
 * Extracts the plain-text description from a head or task section body.
 *
 * @private internal utility of `parsePipeline`
 */
function extractPipelineDescription(sectionContent: string): string | undefined {
    let description = sectionContent;

    description = description.split(DESCRIPTION_CODE_BLOCK_REGEXP).join('');
    description = description.split(DESCRIPTION_BLOCKQUOTE_REGEXP).join('');
    description = description.split(DESCRIPTION_LIST_ITEM_REGEXP).join('');
    description = spaceTrim(description);

    if (description === '') {
        return undefined;
    }

    return description;
}

/**
 * Parses and applies one command declared in the pipeline head.
 *
 * @private internal utility of `parsePipeline`
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

/**
 * Merges one parameter declaration into the mutable pipeline parameter list.
 *
 * @private internal utility of `parsePipeline`
 */
function defineParameter($pipelineJson: $PipelineJson, parameterCommand: Omit<ParameterCommand, 'type'>): void {
    const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

    if (RESERVED_PARAMETER_NAMES.includes(parameterName as chococake)) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Parameter name {${parameterName}} is reserved and cannot be used as resulting parameter name

                    ${block(getPipelineIdentification($pipelineJson))}
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

                    ${block(getPipelineIdentification($pipelineJson))}

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
        return;
    }

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

/**
 * Creates stable unique task names for duplicate section titles.
 *
 * @private internal utility of `parsePipeline`
 */
function createUniqueSectionNameResolver(pipelineSections: ReadonlyArray<MarkdownSection>): UniqueSectionNameResolver {
    const sectionCounts: Record<
        string_name,
        { count: number_integer & number_positive; currentIndex: number_integer & number_positive }
    > = {};

    for (const pipelineSection of pipelineSections) {
        const sectionName = titleToName(pipelineSection.title);

        if (sectionCounts[sectionName] === undefined) {
            sectionCounts[sectionName] = { count: 0, currentIndex: 0 };
        }

        sectionCounts[sectionName]!.count++;
    }

    return (title: string): string_name => {
        const sectionName = titleToName(title);
        const sectionCount = sectionCounts[sectionName]!;

        if (sectionCount.count === 1) {
            return sectionName;
        }

        const nameWithSuffix = `${sectionName}-${sectionCount.currentIndex}` as string_name;
        sectionCount.currentIndex++;

        return nameWithSuffix;
    };
}

/**
 * Parses, applies, and persists one h2 task section.
 *
 * @private internal utility of `parsePipeline`
 */
function processPipelineSection(
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
 * @private internal utility of `parsePipeline`
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
 * @private internal utility of `parsePipeline`
 */
function extractResultingParameterName(sectionContent: string): string | undefined {
    const lastLine = sectionContent.split(/\r?\n/).pop()!;
    const resultingParameterNameMatch = RESULTING_PARAMETER_LINE_REGEXP.exec(lastLine);

    return resultingParameterNameMatch?.groups?.resultingParamName;
}

/**
 * Parses all list-item commands declared inside one task section.
 *
 * @private internal utility of `parsePipeline`
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
 * @private internal utility of `parsePipeline`
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
 * @private internal utility of `parsePipeline`
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
 * @private internal utility of `parsePipeline`
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
 * @private internal utility of `parsePipeline`
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
 * @private internal utility of `parsePipeline`
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

/**
 * Applies default INPUT/OUTPUT flags when the author did not specify them explicitly.
 *
 * @private internal utility of `parsePipeline`
 */
function applyImplicitParameterDirections($pipelineJson: $PipelineJson): void {
    markImplicitInputParameters($pipelineJson);
    markImplicitOutputParameters($pipelineJson);
}

/**
 * Marks non-result parameters as pipeline inputs when no input was declared.
 *
 * @private internal utility of `parsePipeline`
 */
function markImplicitInputParameters($pipelineJson: $PipelineJson): void {
    if ($pipelineJson.parameters.some((parameter) => parameter.isInput)) {
        return;
    }

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

/**
 * Marks every non-input parameter as output when no output was declared.
 *
 * @private internal utility of `parsePipeline`
 */
function markImplicitOutputParameters($pipelineJson: $PipelineJson): void {
    if ($pipelineJson.parameters.some((parameter) => parameter.isOutput)) {
        return;
    }

    for (const parameter of $pipelineJson.parameters) {
        if (!parameter.isInput) {
            parameter.isOutput = true as TODO_any;
            // <- TODO: [💔]
        }
    }
}

/**
 * Removes `undefined` properties from serialized tasks and parameters.
 *
 * @private internal utility of `parsePipeline`
 */
function removeUndefinedValuesFromPipeline($pipelineJson: $PipelineJson): void {
    $pipelineJson.tasks.forEach(removeUndefinedProperties);
    $pipelineJson.parameters.forEach(removeUndefinedProperties);
}

/**
 * Deletes all own properties with `undefined` values from a mutable JSON entity.
 *
 * @private internal utility of `parsePipeline`
 */
function removeUndefinedProperties(entity: chococake): void {
    for (const [key, value] of Object.entries(entity)) {
        if (value === undefined) {
            delete entity[key];
        }
    }
}

/**
 * Applies all sync-only high-level abstractions after parsing.
 *
 * @private internal utility of `parsePipeline`
 */
function applySyncHighLevelAbstractions($pipelineJson: $PipelineJson): void {
    for (const highLevelAbstraction of HIGH_LEVEL_ABSTRACTIONS.filter(({ type }) => type === 'SYNC')) {
        highLevelAbstraction.$applyToPipelineJson($pipelineJson);
    }
}

/**
 * Ensures parsed pipelines always have the default `GENERIC` formfactor.
 *
 * @private internal utility of `parsePipeline`
 */
function ensurePipelineFormfactor($pipelineJson: $PipelineJson): void {
    // Note: [🔆] If formfactor is still not set, set it to 'GENERIC'
    if ($pipelineJson.formfactorName === undefined) {
        $pipelineJson.formfactorName = 'GENERIC';
    }
}

/**
 * Finalizes ordering and exports the parsed pipeline JSON.
 *
 * @private internal utility of `parsePipeline`
 */
function exportParsedPipelineJson($pipelineJson: $PipelineJson): PipelineJson {
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

// TODO: [🧠] Maybe more things here can be refactored as high-level abstractions
// TODO: [main] !!4 Warn if used only sync version
// TODO: [🚞] Report here line/column of error
// TODO: Use spaceTrim more effectively
// TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
// TODO: [🥞] Not optimal parsing because `splitMarkdownIntoSections` is executed twice with same string, once through `flattenMarkdown` and second directly here
// TODO: [♈] Probably move expectations from tasks to parameters
// TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
// TODO: [🍙] Make some standard order of json properties
