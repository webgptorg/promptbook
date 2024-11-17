import { spaceTrim } from 'spacetrim';
import type { Writable, WritableDeep } from 'type-fest';
import type { ParameterCommand } from '../commands/PARAMETER/ParameterCommand';
import { templateCommandParser } from '../commands/TEMPLATE/templateCommandParser';
import { getParserForCommand } from '../commands/_common/getParserForCommand';
import { parseCommand } from '../commands/_common/parseCommand';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandBase,
    PipelineHeadCommandParser,
    PipelineTemplateCommandParser,
} from '../commands/_common/types/CommandParser';
import { RESERVED_PARAMETER_NAMES } from '../config';
import { ParseError } from '../errors/ParseError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { ParameterJson } from '../types/PipelineJson/ParameterJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { ScriptTemplateJson } from '../types/PipelineJson/ScriptTemplateJson';
import type { TemplateJson } from '../types/PipelineJson/TemplateJson';
import type { PipelineString } from '../types/PipelineString';
import type { ScriptLanguage } from '../types/ScriptLanguage';
import { SUPPORTED_SCRIPT_LANGUAGES } from '../types/ScriptLanguage';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { flattenMarkdown } from '../utils/markdown/flattenMarkdown';
import { parseMarkdownSection } from '../utils/markdown/parseMarkdownSection';
import { removeContentComments } from '../utils/markdown/removeContentComments';
import { splitMarkdownIntoSections } from '../utils/markdown/splitMarkdownIntoSections';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { really_any } from '../utils/organization/really_any';
import { $asDeeplyFrozenSerializableJson } from '../utils/serialization/$asDeeplyFrozenSerializableJson';
import { extractParameterNamesFromTemplate } from './utils/extractParameterNamesFromTemplate';
import { titleToName } from './utils/titleToName';

/**
 * Compile pipeline from string (markdown) format to JSON format synchronously
 *
 * Note: There are 3 similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * Note: This function does not validate logic of the pipeline only the parsing
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParseError} if the promptbook string is not valid
 * @public exported from `@promptbook/core`
 */
export function pipelineStringToJsonSync(pipelineString: PipelineString): PipelineJson {
    const $pipelineJson: $PipelineJson = {
        title: undefined as TODO_any /* <- Note: [🍙] Putting here placeholder to keep `title` on top at final JSON */,
        pipelineUrl: undefined /* <- Note: Putting here placeholder to keep `pipelineUrl` on top at final JSON */,
        bookVersion: undefined /* <- Note: By default no explicit version */,
        description: undefined /* <- Note: [🍙] Putting here placeholder to keep `description` on top at final JSON */,
        parameters: [],
        templates: [],
        knowledgeSources: [],
        knowledgePieces: [],
        personas: [],
        preparations: [],
        // <- TODO: [🍙] Some standard order of properties
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

    if (pipelineString.startsWith('#!')) {
        const [shebangLine, ...restLines] = pipelineString.split('\n');

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
        pipelineString = restLines.join('\n') as PipelineString;
    }
    pipelineString = removeContentComments(pipelineString);
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
    const defineParam = (
        parameterCommand: Omit<ParameterCommand, 'type'>,

        // TODO: !!!!!! Use or remove> Pick<ParameterCommand, 'parameterName'> & Partial<Omit<ParameterCommand, 'type' | 'name'>>,
    ) => {
        const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

        if (RESERVED_PARAMETER_NAMES.includes(parameterName as really_any)) {
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
                        Parameter {${parameterName}} is defined multiple times with different description:

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
            $pipelineJson.parameters.push({
                name: parameterName,
                description: parameterDescription || undefined,
                isInput,
                isOutput,
            });
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
                        Command ${
                            command.type
                        } is not allowed in the head of the promptbook ONLY at the pipeline template

                        ${block(getPipelineIdentification())}
                    `,
                ),
            ); // <- TODO: [🚞]
        }

        try {
            (commandParser as PipelineHeadCommandParser<CommandBase>).$applyToPipelineJson(command, $pipelineJson);
            //             <- Note: [🦦] Its strange that this assertion must be here, [🦦][4] should do this assertion implicitelly
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
    // Note: 4️⃣ Process each template of the pipeline

    for (const section of pipelineSections) {
        // TODO: Parse template description (the content out of the codeblock and lists)

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

        const $templateJson: $TemplateJson = {
            isTemplateTypeSet: false,
            isTemplate: true,
            templateType:
                undefined /* <- Note: [🍙] Putting here placeholder to keep `templateType` on top at final JSON */,
            name: titleToName(section.title),
            title: section.title,
            description,
            content,
            // <- TODO: [🍙] Some standard order of properties
        };

        const lastLine = section.content.split('\n').pop()!;
        const resultingParameterNameMatch = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im.exec(lastLine);
        if (
            resultingParameterNameMatch &&
            resultingParameterNameMatch.groups !== undefined &&
            resultingParameterNameMatch.groups.resultingParamName !== undefined
        ) {
            $templateJson.resultingParameterName = resultingParameterNameMatch.groups.resultingParamName;
        }

        // TODO: [🥥] Maybe move this logic to `$parseAndApplyPipelineTemplateCommands`
        const commands = listItems.map((listItem) => ({
            listItem,
            command: parseCommand(listItem, 'PIPELINE_TEMPLATE'),
        }));

        // Note: If block type is not set, set it to 'PROMPT_TEMPLATE'
        if (commands.some(({ command }) => command.type === 'TEMPLATE') === false) {
            templateCommandParser.$applyToTemplateJson(
                { type: 'TEMPLATE', templateType: 'PROMPT_TEMPLATE' },
                $templateJson,
                $pipelineJson,
            );
        }

        // TODO [♓️] List commands and before apply order them to achieve order-agnostic commands

        for (const { listItem, command } of commands) {
            const commandParser = getParserForCommand(command);

            if (commandParser.isUsedInPipelineTemplate !== true /* <- Note: [🦦][4] */) {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            Command ${
                                command.type
                            } is not allowed in the template of the promptbook ONLY at the pipeline head

                            ${block(getPipelineIdentification())}
                        `,
                    ),
                ); // <- TODO: [🚞]
            }

            try {
                (commandParser as PipelineTemplateCommandParser<CommandBase>).$applyToTemplateJson(
                    //            <- Note: [🦦] Its strange that this assertion must be here, [🦦][4] should do this assertion implicitelly
                    command,
                    $templateJson,
                    $pipelineJson,
                );
            } catch (error) {
                if (!(error instanceof ParseError)) {
                    throw error;
                }

                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            Command ${command.type} failed to apply to the template

                            The error:
                            ${block((error as ParseError).message)}

                            Current state of the template:
                            ${block(JSON.stringify($templateJson, null, 4))}
                               <- Maybe wrong order of commands?

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

        // TODO: [🍧] Should be done in TEMPLATE command
        if (($templateJson as WritableDeep<TemplateJson>).templateType === 'SCRIPT_TEMPLATE') {
            if (!language) {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            You must specify the language of the script in the SCRIPT TEMPLATE

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

            ($templateJson as Partial<$TemplateJson> as Writable<ScriptTemplateJson>).contentLanguage =
                language as ScriptLanguage;
        }

        $templateJson.dependentParameterNames = Array.from(
            extractParameterNamesFromTemplate(
                $templateJson as TemplateJson,
                // <- TODO: [3]
            ),
        );

        for (const parameterName of $templateJson.dependentParameterNames) {
            // TODO: [🧠] This definition should be made first in the template
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
        if ($templateJson.templateType !== 'PROMPT_TEMPLATE' && $templateJson.modelRequirements !== undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Model requirements are defined for the block type ${
                            $templateJson.templateType
                        } which is not a PROMPT TEMPLATE

                        This should be avoided by the \`modelCommandParser\`

                        ${block(getPipelineIdentification())}
                  `,
                ),
            );
        }
        */

        if ($templateJson.isTemplate) {
            delete ($templateJson as Partial<$TemplateJson>).isTemplateTypeSet;
            delete ($templateJson as Partial<$TemplateJson>).isTemplate;

            // TODO: [🍙] Maybe do reorder of `$templateJson` here

            $pipelineJson.templates.push(
                $templateJson as TemplateJson,
                // <- TODO: [3] Do not do `as TemplateJson` BUT make 100% sure that nothing is missing
            );
        }
    }

    // =============================================================
    // Note: 5️⃣ Mark parameters as INPUT if not explicitly set
    if ($pipelineJson.parameters.every((parameter) => !parameter.isInput)) {
        for (const parameter of $pipelineJson.parameters) {
            const isThisParameterResulting = $pipelineJson.templates.some(
                (template) => template.resultingParameterName === parameter.name,
            );
            if (!isThisParameterResulting) {
                parameter.isInput = true;
            }
        }
    }

    // =============================================================
    // Note: 6️⃣ Mark all non-INPUT parameters as OUTPUT if any OUTPUT is not set
    if ($pipelineJson.parameters.every((parameter) => !parameter.isOutput)) {
        for (const parameter of $pipelineJson.parameters) {
            if (!parameter.isInput) {
                parameter.isOutput = true;
            }
        }
    }

    // =============================================================
    // Note: 7️⃣ Cleanup of undefined values
    $pipelineJson.templates.forEach((templates) => {
        for (const [key, value] of Object.entries(templates)) {
            if (value === undefined) {
                delete (templates as really_any)[key];
            }
        }
    });
    $pipelineJson.parameters.forEach((parameter) => {
        for (const [key, value] of Object.entries(parameter)) {
            if (value === undefined) {
                delete (parameter as really_any)[key];
            }
        }
    });
    // =============================================================

    // TODO: [🍙] Maybe do reorder of `$pipelineJson` here
    return $asDeeplyFrozenSerializableJson('pipelineJson', $pipelineJson);
}

/**
 * TODO: [main] !!!! Warn if used only sync version
 * TODO: [🚞] Report here line/column of error
 * TODO: Use spaceTrim more effectively
 * TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
 * TODO: [🥞] Not optimal parsing because `splitMarkdownIntoSections` is executed twice with same string, once through `flattenMarkdown` and second directly here
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🍙] Make some standard order of json properties
 */
