import { spaceTrim } from 'spacetrim';
import type { Writable, WritableDeep } from 'type-fest';
import type { ScriptJson } from '../types/PipelineJson/ScriptJson';
import { knowledgeCommandParser } from '../commands/KNOWLEDGE/knowledgeCommandParser';
import type { ParameterCommand } from '../commands/PARAMETER/ParameterCommand';
import { personaCommandParser } from '../commands/PERSONA/personaCommandParser';
import { parseCommand } from '../commands/_common/parseCommand';
import { RESERVED_PARAMETER_NAMES } from '../config';
import { NotYetImplementedError } from '../errors/NotYetImplementedError';
import { ParsingError } from '../errors/ParsingError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { ModelRequirements } from '../types/ModelRequirements';
import type { ExpectationUnit } from '../types/PipelineJson/Expectations';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { PromptTemplateParameterJson } from '../types/PipelineJson/PromptTemplateParameterJson';
import type { PipelineString } from '../types/PipelineString';
import type { ScriptLanguage } from '../types/ScriptLanguage';
import { SUPPORTED_SCRIPT_LANGUAGES } from '../types/ScriptLanguage';
import type { string_parameter_name } from '../types/typeAliases';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { flattenMarkdown } from '../utils/markdown/flattenMarkdown';
import { parseMarkdownSection } from '../utils/markdown/parseMarkdownSection';
import { removeContentComments } from '../utils/markdown/removeContentComments';
import { splitMarkdownIntoSections } from '../utils/markdown/splitMarkdownIntoSections';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { really_any } from '../utils/organization/really_any';
import { PROMPTBOOK_VERSION } from '../version';
import { extractParametersFromPromptTemplate } from './utils/extractParametersFromPromptTemplate';
import { titleToName } from './utils/titleToName';

/**
 * Compile pipeline from string (markdown) format to JSON format synchronously
 *
 * Note: There are 3 similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParsingError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export function pipelineStringToJsonSync(pipelineString: PipelineString): PipelineJson {
    const pipelineJson: WritableDeep<PipelineJson> = {
        title: undefined as TODO_any /* <- Note: Putting here placeholder to keep `title` on top at final JSON */,
        pipelineUrl: undefined /* <- Note: Putting here placeholder to keep `pipelineUrl` on top at final JSON */,
        promptbookVersion: PROMPTBOOK_VERSION,
        description: undefined /* <- Note: Putting here placeholder to keep `description` on top at final JSON */,
        parameters: [],
        promptTemplates: [],
        knowledgeSources: [],
        knowledgePieces: [],
        personas: [],
        preparations: [],
    };

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
            spaceTrim(`
                Pipeline head is not defined

                This should never happen, because the pipeline already flattened
            `), // <- TODO: [🚞]
        );
    }
    if (pipelineHead.level !== 1) {
        throw new UnexpectedError(
            spaceTrim(`
                Pipeline head is not h1

                This should never happen, because the pipeline already flattened
            `), // <- TODO: [🚞]
        );
    }
    if (!pipelineSections.every((section) => section.level === 2)) {
        throw new UnexpectedError(
            spaceTrim(`
                Not every pipeline section is h2

                This should never happen, because the pipeline already flattened
            `), // <- TODO: [🚞]
        );
    }

    // =============================================================
    ///Note: 2️⃣ Function for defining parameters
    const defineParam = (parameterCommand: Omit<ParameterCommand, 'type'>) => {
        const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

        if (RESERVED_PARAMETER_NAMES.includes(parameterName as really_any)) {
            throw new ParsingError(
                `Parameter name {${parameterName}} is reserved and cannot be used as resulting parameter name` /* <- TODO: [🚞] */,
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

    const defaultModelRequirements: Partial<Writable<ModelRequirements>> = {};
    const listItems = extractAllListItemsFromMarkdown(pipelineHead.content);
    for (const listItem of listItems) {
        const command = parseCommand(listItem, 'PIPELINE_HEAD');

        switch (command.type) {
            // TODO: [🍧] Use here applyToPipelineJson and remove switch statement
            case 'MODEL':
                defaultModelRequirements[command.key] = command.value;
                break;
            case 'PARAMETER':
                defineParam(command);
                break;
            case 'PROMPTBOOK_VERSION':
                pipelineJson.promptbookVersion = command.promptbookVersion;
                break;
            case 'URL':
                pipelineJson.pipelineUrl = command.pipelineUrl.href;
                break;
            case 'KNOWLEDGE':
                knowledgeCommandParser.applyToPipelineJson!(command, { pipelineJson, templateJson: null });
                break;
            case 'ACTION':
                console.error(new NotYetImplementedError('Actions are not implemented yet'));
                break;
            case 'INSTRUMENT':
                console.error(new NotYetImplementedError('Instruments are not implemented yet'));
                break;
            case 'PERSONA':
                personaCommandParser.applyToPipelineJson!(command, { pipelineJson, templateJson: null });
                //                    <- Note: Prototype of [🍧] (remove this comment after full implementation)
                break;
            case 'BOILERPLATE':
                throw new ParsingError(
                    'BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file',
                ); // <- TODO: [🚞]
                break;

            // <- [💐]

            default:
                throw new ParsingError(
                    `Command ${command.type} is not allowed in the head of the promptbook ONLY at the pipeline template`,
                ); // <- TODO: [🚞]
        }
    }

    // =============================================================
    // Note: 4️⃣ Process each template of the pipeline

    templates: for (const section of pipelineSections) {
        // TODO: Parse prompt template description (the content out of the codeblock and lists)

        const templateModelRequirements: Partial<Writable<ModelRequirements>> = {
            ...defaultModelRequirements,

            // <- TODO: [🧠][❔] Should there be possibility to set MODEL for entire pipeline?
        };
        const listItems = extractAllListItemsFromMarkdown(section.content);

        const lastLine = section.content.split('\n').pop()!;
        const resultingParameterNameMatch = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im.exec(lastLine);
        let resultingParameterName: string_parameter_name | null = null;
        if (
            resultingParameterNameMatch &&
            resultingParameterNameMatch.groups !== undefined &&
            resultingParameterNameMatch.groups.resultingParamName !== undefined
        ) {
            resultingParameterName = resultingParameterNameMatch.groups.resultingParamName;
        }

        const expectResultingParameterName = () => {
            if (resultingParameterName !== null) {
                return resultingParameterName;
            }
            throw new ParsingError(
                spaceTrim(
                    (block) => `
                    Template section must end with -> {parameterName}

                    Invalid section:
                    ${block(
                        // TODO: Show code of invalid sections each time + DRY
                        section.content
                            .split('\n')
                            .map((line) => `  | ${line}` /* <- TODO: [🚞] */)
                            .join('\n'),
                    )}
                  `,
                ),
            );
        };

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
            modelRequirements: templateModelRequirements as ModelRequirements,
            content,
        };

        /**
         * This is nessesary because block type can be
         * - Set zero times, so anticipate 'PROMPT_TEMPLATE'
         * - Set one time
         * - Set more times - throw error
         *
         * Note: [2]
         */
        let isBlockTypeSet = false;

        for (const listItem of listItems) {
            const command = parseCommand(listItem, 'PIPELINE_TEMPLATE');
            // TODO [🍧][♓️] List commands and before apply order them

            switch (command.type) {
                // TODO: [🍧] Use here applyToPipelineJson and remove switch statement
                case 'BLOCK':
                    if (isBlockTypeSet) {
                        throw new ParsingError(
                            'Block type is already defined in the prompt template. It can be defined only once.',
                            // <- TODO: [🚞]
                        );
                    }

                    if (command.blockType === 'SAMPLE') {
                        expectResultingParameterName();

                        const parameter = pipelineJson.parameters.find(
                            (param) => param.name === resultingParameterName,
                        );
                        if (parameter === undefined) {
                            throw new UnexpectedError(
                                `Can not find parameter {${resultingParameterName}} to assign sample value`,
                                // <- TODO: [🚞]
                            );
                        }
                        parameter.sampleValues = parameter.sampleValues || [];
                        parameter.sampleValues.push(content);

                        continue templates;
                    }

                    if (command.blockType === 'KNOWLEDGE') {
                        knowledgeCommandParser.applyToPipelineJson!(
                            {
                                type: 'KNOWLEDGE',
                                source: content, // <- TODO: [🐝] !!! Work with KNOWLEDGE which not referring to the source file or website, but its content itself
                            },
                            {
                                pipelineJson,
                                templateJson,
                            },
                        );
                        continue templates;
                    }

                    if (command.blockType === 'ACTION') {
                        console.error(new NotYetImplementedError('Actions are not implemented yet'));
                        continue templates;
                    }

                    if (command.blockType === 'INSTRUMENT') {
                        console.error(new NotYetImplementedError('Instruments are not implemented yet'));
                        continue templates;
                    }

                    expectResultingParameterName();
                    (templateJson as WritableDeep<PromptTemplateJson>).blockType = command.blockType;
                    isBlockTypeSet = true; //<- Note: [2]
                    break;
                case 'EXPECT_AMOUNT':
                    // eslint-disable-next-line no-case-declarations
                    const unit = command.unit.toLowerCase() as Lowercase<ExpectationUnit>;

                    templateJson.expectations = templateJson.expectations || {};
                    templateJson.expectations[unit] = templateJson.expectations[unit] || {};

                    if (command.sign === 'MINIMUM' || command.sign === 'EXACTLY') {
                        if (templateJson.expectations[unit]!.min !== undefined) {
                            throw new ParsingError(
                                `Already defined minumum ${
                                    templateJson.expectations[unit]!.min
                                } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                                // <- TODO: [🚞]
                            );
                        }
                        templateJson.expectations[unit]!.min = command.amount;
                    } /* not else */
                    if (command.sign === 'MAXIMUM' || command.sign === 'EXACTLY') {
                        if (templateJson.expectations[unit]!.max !== undefined) {
                            throw new ParsingError(
                                `Already defined maximum ${
                                    templateJson.expectations[unit]!.max
                                } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                                // <- TODO: [🚞]
                            );
                        }
                        templateJson.expectations[unit]!.max = command.amount;
                    }
                    break;

                case 'EXPECT_FORMAT':
                    if (templateJson.expectFormat !== undefined && command.format !== templateJson.expectFormat) {
                        throw new ParsingError(
                            spaceTrim(`
                                Expect format is already defined to "${templateJson.expectFormat}".
                                Now you try to redefine it by "${command.format}".
                            `),
                            // <- TODO: [🚞]
                        );
                    }
                    templateJson.expectFormat = command.format;

                    break;

                case 'JOKER':
                    templateJson.jokerParameterNames = templateJson.jokerParameterNames || [];
                    templateJson.jokerParameterNames.push(command.parameterName);

                    break;

                case 'MODEL':
                    templateModelRequirements[command.key] = command.value;
                    break;
                case 'PARAMETER':
                    // Note: This is just for detecting resulitng parameter name

                    defineParam(command);
                    break;
                case 'POSTPROCESS':
                    templateJson.postprocessingFunctionNames = templateJson.postprocessingFunctionNames || [];
                    templateJson.postprocessingFunctionNames.push(command.functionName);
                    break;
                case 'KNOWLEDGE':
                    // TODO: [👙] The knowledge is maybe relevant for just this template
                    knowledgeCommandParser.applyToPipelineJson!(command, { pipelineJson, templateJson });
                    break;
                case 'ACTION':
                    // TODO: [👙] The action is maybe relevant for just this template
                    console.error(new NotYetImplementedError('Actions are not implemented yet'));
                    break;
                case 'INSTRUMENT':
                    // TODO: [👙] The instrument is maybe relevant for just this template
                    console.error(new NotYetImplementedError('Instruments are not implemented yet'));
                    break;
                case 'PERSONA':
                    personaCommandParser.applyToPipelineJson!(command, { pipelineJson, templateJson });
                    //                    <- Note: Prototype of [🍧] (remove this comment after full implementation)
                    break;
                case 'BOILERPLATE':
                    console.error(
                        new ParsingError(
                            'BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file',
                        ),
                    );
                    break;

                // <- [💐]

                default:
                    throw new ParsingError(
                        `Command ${command.type} is not allowed in the block of the prompt template ONLY at the head of the pipeline`,
                        // <- TODO: [🚞]
                    );
            }
        }

        // TODO: [🍧] Should be done in BLOCK command
        if ((templateJson as WritableDeep<PromptTemplateJson>).blockType === 'SCRIPT') {
            if (!language) {
                throw new ParsingError(
                    'You must specify the language of the script in the prompt template',
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

        // TODO: [🍧][❔] Should be done in BLOCK command
        if (templateModelRequirements.modelVariant === undefined) {
            templateModelRequirements.modelVariant = 'CHAT';
        }

        templateJson.dependentParameterNames = Array.from(
            extractParametersFromPromptTemplate(
                templateJson as PromptTemplateJson,
                // <- TODO: [3]
            ),
        );

        // TODO: [🍧][❔] Remove this condition - modelRequirements should be put here via BLOCK command not removed when PROMPT_TEMPLATE
        if (templateJson.blockType !== 'PROMPT_TEMPLATE') {
            delete (templateJson as TODO_any).modelRequirements;
        }

        // TODO: [🍧] Make this better - for example each command parser can call and apply this
        templateJson.resultingParameterName = expectResultingParameterName(/* <- Note: This is once more redundant */);

        // TODO: [🍧] What actually about preparation and pushing the block into `promptTemplates`
        pipelineJson.promptTemplates.push(
            templateJson as PromptTemplateJson,
            // <- TODO: [3] Do not do `as PromptTemplateJson` BUT make 100% sure that nothing is missing
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
    return pipelineJson;
}

/**
 * TODO: !!!! Warn if used only sync version
 * TODO: [🚞] Report here line/column of error
 * TODO: Use spaceTrim more effectively
 * TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
 * TODO: [🥞] Not optimal parsing because `splitMarkdownIntoSections` is executed twice with same string, once through `flattenMarkdown` and second directly here
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
