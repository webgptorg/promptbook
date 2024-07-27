import { spaceTrim } from 'spacetrim';
import type { IterableElement, Writable, WritableDeep } from 'type-fest';
import type { BlockType } from '../commands/BLOCK/BlockTypes';
import type { ParameterCommand } from '../commands/PARAMETER/ParameterCommand';
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
import type { really_any, TODO } from '../types/typeAliases';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { flattenMarkdown } from '../utils/markdown/flattenMarkdown';
import { parseMarkdownSection } from '../utils/markdown/parseMarkdownSection';
import { removeContentComments } from '../utils/markdown/removeContentComments';
import { splitMarkdownIntoSections } from '../utils/markdown/splitMarkdownIntoSections';
import { difference } from '../utils/sets/difference';
import { union } from '../utils/sets/union';
import { PROMPTBOOK_VERSION } from '../version';
import { extractParametersFromPromptTemplate } from './utils/extractParametersFromPromptTemplate';
import { titleToName } from './utils/titleToName';

/**
 * Compile promptbook from string (markdown) format to JSON format synchronously
 *
 * Note: There are two similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @param options - Options and tools for the compilation
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParsingError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export function pipelineStringToJsonSync(pipelineString: PipelineString): PipelineJson {
    const pipelineJson: WritableDeep<PipelineJson> = {
        title: undefined as TODO /* <- Note: Putting here placeholder to keep `title` on top at final JSON */,
        pipelineUrl: undefined /* <- Note: Putting here placeholder to keep `pipelineUrl` on top at final JSON */,
        promptbookVersion: PROMPTBOOK_VERSION,
        description: undefined /* <- Note: Putting here placeholder to keep `description` on top at final JSON */,
        parameters: [],
        promptTemplates: [],
        knowledge: [],
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
            `),
        );
    }
    if (pipelineHead.level !== 1) {
        throw new UnexpectedError(
            spaceTrim(`
                Pipeline head is not h1

                This should never happen, because the pipeline already flattened
            `),
        );
    }
    if (!pipelineSections.every((section) => section.level === 2)) {
        throw new UnexpectedError(
            spaceTrim(`
                Not every pipeline section is h2

                This should never happen, because the pipeline already flattened
            `),
        );
    }

    // =============================================================
    ///Note: 2️⃣ Function for defining parameters
    const defineParam = (parameterCommand: Omit<ParameterCommand, 'type'>) => {
        const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

        if (RESERVED_PARAMETER_NAMES.includes(parameterName)) {
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
                        Parameter {${parameterName}} is defined multiple times with different description.

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

    // TODO: [1] DRY description
    let description: string | undefined = pipelineHead.content;

    // Note: Remove codeblocks - TODO: Maybe put this into util (exported from `@promptbool/utils`)
    description = description.split(/^```.*^```/gms).join('');
    //Note: Remove lists and return statement - TODO: Maybe put this into util (exported from `@promptbool/utils`)
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
                console.error(new NotYetImplementedError('Knowledge is not implemented yet'));
                break;
            case 'ACTION':
                console.error(new NotYetImplementedError('Actions are not implemented yet'));
                break;
            case 'INSTRUMENT':
                console.error(new NotYetImplementedError('Instruments are not implemented yet'));
                break;
            case 'PERSONA':
                console.error(new NotYetImplementedError('Personas are not implemented yet'));
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

        const templateModelRequirements: Partial<Writable<ModelRequirements>> = { ...defaultModelRequirements };
        const listItems = extractAllListItemsFromMarkdown(section.content);
        let dependentParameterNames = new Set<IterableElement<PromptTemplateJson['dependentParameterNames']>>();
        let blockType: BlockType = 'PROMPT_TEMPLATE';
        let jokers: PromptTemplateJson['jokers'] = [];
        let postprocessing: PromptTemplateJson['postprocessing'] = [];
        let expectAmount: PromptTemplateJson['expectations'] = {};
        let expectFormat: PromptTemplateJson['expectFormat'] | undefined = undefined;

        let isBlockTypeChanged = false;

        for (const listItem of listItems) {
            const command = parseCommand(listItem, 'PIPELINE_TEMPLATE');
            switch (command.type) {
                // TODO: [🍧] Use here applyToPipelineJson and remove switch statement
                case 'BLOCK':
                    if (isBlockTypeChanged) {
                        throw new ParsingError(
                            'Block type is already defined in the prompt template. It can be defined only once.',
                            // <- TODO: [🚞]
                        );
                    }

                    if (command.blockType === 'SAMPLE') {
                        console.error(new NotYetImplementedError('Block type SAMPLE is not implemented yet'));
                        continue templates;
                    }

                    if (command.blockType === 'KNOWLEDGE') {
                        console.error(new NotYetImplementedError('Knowledge is not implemented yet'));
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

                    blockType = command.blockType;
                    isBlockTypeChanged = true;
                    break;
                case 'EXPECT_AMOUNT':
                    // eslint-disable-next-line no-case-declarations
                    const unit = command.unit.toLowerCase() as Lowercase<ExpectationUnit>;

                    expectAmount[unit] = expectAmount[unit] || {};

                    if (command.sign === 'MINIMUM' || command.sign === 'EXACTLY') {
                        if (expectAmount[unit]!.min !== undefined) {
                            throw new ParsingError(
                                `Already defined minumum ${
                                    expectAmount[unit]!.min
                                } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                                // <- TODO: [🚞]
                            );
                        }
                        expectAmount[unit]!.min = command.amount;
                    } /* not else */
                    if (command.sign === 'MAXIMUM' || command.sign === 'EXACTLY') {
                        if (expectAmount[unit]!.max !== undefined) {
                            throw new ParsingError(
                                `Already defined maximum ${
                                    expectAmount[unit]!.max
                                } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                                // <- TODO: [🚞]
                            );
                        }
                        expectAmount[unit]!.max = command.amount;
                    }
                    break;

                case 'EXPECT_FORMAT':
                    if (expectFormat !== undefined && command.format !== expectFormat) {
                        throw new ParsingError(
                            `Expect format is already defined to "${expectFormat}". Now you try to redefine it by "${command.format}".`,
                            // <- TODO: [🚞]
                        );
                    }
                    expectFormat = command.format;

                    break;

                case 'JOKER':
                    jokers.push(command.parameterName);
                    dependentParameterNames.add(command.parameterName);
                    break;

                case 'MODEL':
                    templateModelRequirements[command.key] = command.value;
                    break;
                case 'PARAMETER':
                    // Note: This is just for detecting resulitng parameter name

                    defineParam(command);
                    break;
                case 'POSTPROCESS':
                    postprocessing.push(command.functionName);
                    break;
                case 'KNOWLEDGE':
                    console.error(new NotYetImplementedError('Knowledge is not implemented yet'));
                    break;
                case 'ACTION':
                    console.error(new NotYetImplementedError('Actions are not implemented yet'));
                    break;
                case 'INSTRUMENT':
                    console.error(new NotYetImplementedError('Instruments are not implemented yet'));
                    break;
                case 'PERSONA':
                    console.error(new NotYetImplementedError('Personas are not implemented yet'));
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

        const { language, content } = extractOneBlockFromMarkdown(section.content);

        if (blockType === 'SCRIPT') {
            if (!language) {
                throw new ParsingError(
                    'You must specify the language of the script in the prompt template',
                    // <- TODO: [🚞]
                );
            } else if (!SUPPORTED_SCRIPT_LANGUAGES.includes(language as ScriptLanguage)) {
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
        }

        const lastLine = section.content.split('\n').pop()!;
        const match = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im.exec(lastLine);
        if (!match || match.groups === undefined || match.groups.resultingParamName === undefined) {
            throw new ParsingError(
                spaceTrim(
                    (block) => `
                        Each section must end with -> {parameterName}

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
        }
        const resultingParameterName = match.groups.resultingParamName;

        // TODO: [1] DRY description
        let description: string | undefined = section.content;

        // Note: Remove codeblocks
        description = description.split(/^```.*^```/gms).join('');
        //Note: Remove lists and return statement
        description = description.split(/^(?:(?:-)|(?:\d\))|(?:`?->))\s+.*$/gm).join('');
        description = spaceTrim(description);
        if (description === '') {
            description = undefined;
        }

        if (Object.keys(jokers).length === 0) {
            jokers = undefined;
        }

        if (Object.keys(expectAmount).length === 0) {
            expectAmount = undefined;
        }

        if (Object.keys(postprocessing).length === 0) {
            postprocessing = undefined;
        }

        dependentParameterNames = union(
            dependentParameterNames,
            extractParametersFromPromptTemplate({
                ...section,
                description,
                blockType,
                content,
            }),
        );

        if (templateModelRequirements.modelVariant === undefined) {
            templateModelRequirements.modelVariant = 'CHAT';
        }

        dependentParameterNames = difference(dependentParameterNames, new Set(RESERVED_PARAMETER_NAMES));

        const template = {
            name: titleToName(section.title),
            title: section.title,
            description,
            dependentParameterNames: Array.from(dependentParameterNames),
            blockType,
            jokers,
            postprocessing,
            expectations: expectAmount,
            expectFormat,
            modelRequirements: templateModelRequirements as ModelRequirements,
            contentLanguage: blockType === 'SCRIPT' ? (language as ScriptLanguage) : undefined,
            content,
            resultingParameterName,
        };

        if (blockType !== 'PROMPT_TEMPLATE') {
            delete (template as TODO).modelRequirements;
        }

        // TODO: [🍧] What actually about preparation and pushing the block into `promptTemplates`
        pipelineJson.promptTemplates.push(template as TODO /* <- !!! */);
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
 */
