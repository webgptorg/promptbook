import { spaceTrim } from 'spacetrim';
import type { Writable, WritableDeep } from 'type-fest';
import { COMMANDS } from '../commands';
import type { ParameterCommand } from '../commands/PARAMETER/ParameterCommand';
import { parseCommand } from '../commands/_common/parseCommand';
import {
    CommandBase,
    PipelineHeadCommandParser,
    PipelineTemplateCommandParser,
} from '../commands/_common/types/CommandParser';
import { RESERVED_PARAMETER_NAMES } from '../config';
import { ParsingError } from '../errors/ParsingError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { PromptTemplateParameterJson } from '../types/PipelineJson/PromptTemplateParameterJson';
import type { ScriptJson } from '../types/PipelineJson/ScriptJson';
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
import { PROMPTBOOK_VERSION } from '../version';
import { extractParameterNamesFromPromptTemplate } from './utils/extractParameterNamesFromPromptTemplate';
import { titleToName } from './utils/titleToName';

/**
 * Compile pipeline from string (markdown) format to JSON format synchronously
 *
 * Note: There are 3 similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParsingError} if the promptbook string is not valid
 * @public exported from `@promptbook/core`
 */
export function pipelineStringToJsonSync(pipelineString: PipelineString): PipelineJson {
    const pipelineJson: WritableDeep<PipelineJson> = {
        title: undefined as TODO_any /* <- Note: Putting here placeholder to keep `title` on top at final JSON */,
        pipelineUrl: undefined /* <- Note: Putting here placeholder to keep `pipelineUrl` on top at final JSON */,
        promptbookVersion: PROMPTBOOK_VERSION,
        description: undefined /* <- Note: Putting here placeholder to keep `description` on top at final JSON */,
        parameters: [],
        defaultModelRequirements: {},
        promptTemplates: [],
        knowledgeSources: [],
        knowledgePieces: [],
        personas: [],
        preparations: [],
        // <- TODO: [🍙] Some standard order of properties
    };

    function getPipelineIdentification() {
        // Note: This is a 😐 implementation of [🚞]
        const _: Array<string> = [];

        if (pipelineJson.sourceFile !== undefined) {
            _.push(`File: ${pipelineJson.sourceFile}`);
        }

        if (pipelineJson.pipelineUrl !== undefined) {
            _.push(`Url: ${pipelineJson.pipelineUrl}`);
        }

        return _.join('\n');
    }

    // =============================================================
    // Note: 1️⃣ Parsing of the markdown into object
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
    const defineParam = (parameterCommand: Omit<ParameterCommand, 'type'>) => {
        const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

        if (RESERVED_PARAMETER_NAMES.includes(parameterName as really_any)) {
            throw new ParsingError(
                spaceTrim(
                    (block) => `
                        Parameter name {${parameterName}} is reserved and cannot be used as resulting parameter name

                        ${block(getPipelineIdentification())}
                    `,
                ) /* <- TODO: [🚞] */,
            );
        }

        const existingParameter = pipelineJson.parameters.find(
            (parameter: PromptTemplateParameterJson) => parameter.name === parameterName,
        );
        if (
            existingParameter &&
            existingParameter.description &&
            existingParameter.description !== parameterDescription &&
            parameterDescription
        ) {
            throw new ParsingError(
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
        } else {
            pipelineJson.parameters.push({
                name: parameterName,
                description: parameterDescription || undefined,
                isInput,
                isOutput,
            });
        }
    };

    // =============================================================
    // Note: 3️⃣ Process pipeline head

    pipelineJson.title = pipelineHead.title;

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
    pipelineJson.description = description;

    const listItems = extractAllListItemsFromMarkdown(pipelineHead.content);
    for (const listItem of listItems) {
        // TODO: [🥥] Maybe move this logic to `$parseAndApplyPipelineHeadCommand`
        const command = parseCommand(listItem, 'PIPELINE_HEAD');

        const commandParser = COMMANDS.find((commandParser) => commandParser.name === command.type);

        if (commandParser === undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                          Command ${command.type} parser is not found 🍎

                          ${block(getPipelineIdentification())}
                      `,
                ),
            );
        }

        if (commandParser.isUsedInPipelineHead !== true /* <- Note: [🦦][4] */) {
            throw new ParsingError(
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
            (commandParser as PipelineHeadCommandParser<CommandBase>).$applyToPipelineJson(command, pipelineJson);
            //             <- Note: [🦦] Its strange that this assertion must be here, [🦦][4] should do this assertion implicitelly
        } catch (error) {
            if (!(error instanceof ParsingError)) {
                throw error;
            }

            throw new ParsingError(
                spaceTrim(
                    (block) => `
                        Command ${command.type} failed to apply to the pipeline

                        The error:
                        ${block((error as ParsingError).message)}

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

    /* TODO: !!!!!! Remove `templates:` */ for (const section of pipelineSections) {
        // TODO: Parse prompt template description (the content out of the codeblock and lists)

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

        const templateJson: Partial<WritableDeep<PromptTemplateJson>> = {
            blockType: 'PROMPT_TEMPLATE', // <- Note: [2]
            name: titleToName(section.title),
            title: section.title,
            description,
            content,
        };

        const lastLine = section.content.split('\n').pop()!;
        const resultingParameterNameMatch = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im.exec(lastLine);
        if (
            resultingParameterNameMatch &&
            resultingParameterNameMatch.groups !== undefined &&
            resultingParameterNameMatch.groups.resultingParamName !== undefined
        ) {
            templateJson.resultingParameterName = resultingParameterNameMatch.groups.resultingParamName;
        }

        /**
         * TODO: !!!!!! Remove
         * This is nessesary because block type can be
         * - Set zero times, so anticipate 'PROMPT_TEMPLATE'
         * - Set one time
         * - Set more times - throw error
         *
         * Note: [2]
         */
        // let isBlockTypeSet = false;

        for (const listItem of listItems) {
            // TODO: [🥥] Maybe move this logic to `$parseAndApplyPipelineTemplateCommand`
            const command = parseCommand(listItem, 'PIPELINE_TEMPLATE');
            // TODO [🍧][♓️] List commands and before apply order them

            const commandParser = COMMANDS.find((commandParser) => commandParser.name === command.type);

            if (commandParser === undefined) {
                throw new UnexpectedError(
                    spaceTrim(
                        (block) => `
                              Command ${command.type} parser is not found 🍏

                              ${block(getPipelineIdentification())}
                          `,
                    ),
                );
            }

            if (commandParser.isUsedInPipelineTemplate !== true /* <- Note: [🦦][4] */) {
                throw new ParsingError(
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
                    templateJson,
                    pipelineJson,
                );
            } catch (error) {
                if (!(error instanceof ParsingError)) {
                    throw error;
                }

                throw new ParsingError(
                    spaceTrim(
                        (block) => `
                            Command ${command.type} failed to apply to the template

                            The error:
                            ${block((error as ParsingError).message)}

                            Current state of the template:
                            ${block(JSON.stringify(templateJson, null, 4))}
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

            // TODO: !!!!!! Multiple problematic things in BLOCK command - blockCommandParser.$applyToTemplateJson

            if (command.type === 'PARAMETER') {
                defineParam(command);
                // <- Note: [🍣]
            }
        }

        // TODO: [🍧] !!!!!! Should be done in BLOCK command
        if ((templateJson as WritableDeep<PromptTemplateJson>).blockType === 'SCRIPT') {
            if (!language) {
                throw new ParsingError(
                    spaceTrim(
                        (block) => `
                            You must specify the language of the script in the prompt template

                            ${block(getPipelineIdentification())}
                        `,
                    ),
                    // <- TODO: [🚞]
                );
            }

            if (!SUPPORTED_SCRIPT_LANGUAGES.includes(language as ScriptLanguage)) {
                throw new ParsingError(
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

            (templateJson as TODO_any as Writable<ScriptJson>).contentLanguage = language as TODO_any;
        }

        templateJson.dependentParameterNames = Array.from(
            extractParameterNamesFromPromptTemplate(
                templateJson as PromptTemplateJson,
                // <- TODO: [3]
            ),
        );

        if (Object.keys(templateJson?.modelRequirements || {}).length === 0) {
            delete (templateJson as TODO_any).modelRequirements;
        }

        if (templateJson.blockType !== 'PROMPT_TEMPLATE' && templateJson.modelRequirements !== undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Model requirements are defined for the block type ${
                            templateJson.blockType
                        } which is not a prompt template

                        This should be avoided by the \`modelCommandParser\`

                        ${block(getPipelineIdentification())}
                  `,
                ),
            );
        }

        pipelineJson.promptTemplates.push(
            templateJson as PromptTemplateJson,
            // <- TODO: [3] !!!!!! Do not do `as PromptTemplateJson` BUT make 100% sure that nothing is missing
        );
    }

    // =============================================================
    // Note: 5️⃣ Cleanup of undefined values
    pipelineJson.promptTemplates.forEach((promptTemplates) => {
        for (const [key, value] of Object.entries(promptTemplates)) {
            if (value === undefined) {
                delete (promptTemplates as really_any)[key];
            }
        }
    });
    pipelineJson.parameters.forEach((parameter) => {
        for (const [key, value] of Object.entries(parameter)) {
            if (value === undefined) {
                delete (parameter as really_any)[key];
            }
        }
    });
    // =============================================================
    return $asDeeplyFrozenSerializableJson('pipelineJson', pipelineJson);
}

/**
 * TODO: !!!! Warn if used only sync version
 * TODO: [🚞] Report here line/column of error
 * TODO: Use spaceTrim more effectively
 * TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
 * TODO: [🥞] Not optimal parsing because `splitMarkdownIntoSections` is executed twice with same string, once through `flattenMarkdown` and second directly here
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🍙] Make some standard order of json properties
 */
