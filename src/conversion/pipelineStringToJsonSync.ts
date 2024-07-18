import { spaceTrim } from 'spacetrim';
import type { IterableElement, Writable, WritableDeep } from 'type-fest';
import { SyntaxError } from '../errors/SyntaxError';
import type { ParameterCommand } from '../types/Command';
import type { ExecutionType } from '../types/ExecutionTypes';
import type { ModelRequirements } from '../types/ModelRequirements';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { ExpectationUnit, PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { PromptTemplateParameterJson } from '../types/PipelineJson/PromptTemplateParameterJson';
import type { PipelineString } from '../types/PipelineString';
import type { ScriptLanguage } from '../types/ScriptLanguage';
import { SUPPORTED_SCRIPT_LANGUAGES } from '../types/ScriptLanguage';
import { markdownToMarkdownStructure } from '../utils/markdown-json/markdownToMarkdownStructure';
import { extractAllListItemsFromMarkdown } from '../utils/markdown/extractAllListItemsFromMarkdown';
import { extractOneBlockFromMarkdown } from '../utils/markdown/extractOneBlockFromMarkdown';
import { removeContentComments } from '../utils/markdown/removeContentComments';
import { union } from '../utils/sets/union';
import { PROMPTBOOK_VERSION } from '../version';
import { extractParametersFromPromptTemplate } from './utils/extractParametersFromPromptTemplate';
import { parseCommand } from './utils/parseCommand';
import { titleToName } from './utils/titleToName';
import { flattenMarkdownStructure } from '../_packages/utils.index';

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
 * @throws {SyntaxError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export function pipelineStringToJsonSync(pipelineString: PipelineString): PipelineJson {
    const pipelineJson: WritableDeep<PipelineJson> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: undefined as any /* <- Note: Putting here placeholder to keep `title` on top at final JSON */,
        pipelineUrl: undefined /* <- Note: Putting here placeholder to keep `pipelineUrl` on top at final JSON */,
        promptbookVersion: PROMPTBOOK_VERSION,
        description: undefined /* <- Note: Putting here placeholder to keep `description` on top at final JSON */,
        parameters: [],
        promptTemplates: [],
        knowledge: [],
    };

    // =============================================================
    // Note: 1️⃣ Normalization of the PROMPTBOOK string
    pipelineString = removeContentComments(pipelineString);
    pipelineString = pipelineString.replaceAll(
        /`\{(?<parameterName>[a-z0-9_]+)\}`/gi,
        '{$<parameterName>}',
    ) as PipelineString;
    pipelineString = pipelineString.replaceAll(
        /`->\s+\{(?<parameterName>[a-z0-9_]+)\}`/gi,
        '-> {$<parameterName>}',
    ) as PipelineString;

    // =============================================================
    ///Note: 2️⃣ Function for defining parameters
    const defineParam = (parameterCommand: Omit<ParameterCommand, 'type'>) => {
        const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

        const existingParameter = pipelineJson.parameters.find(
            (parameter: PromptTemplateParameterJson) => parameter.name === parameterName,
        );
        if (
            existingParameter &&
            existingParameter.description &&
            existingParameter.description !== parameterDescription &&
            parameterDescription
        ) {
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                        Parameter {${parameterName}} is defined multiple times with different description.

                        First definition:
                        ${block(existingParameter.description || '[undefined]')}

                        Second definition:
                        ${block(parameterDescription || '[undefined]')}
                    `,
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
    // Note: 3️⃣ Parse each segment of the pipeline
    const markdownStructureUnflatten = markdownToMarkdownStructure(pipelineString);
    const markdownStructure = flattenMarkdownStructure(markdownStructureUnflatten);

    pipelineJson.title = markdownStructure.title;

    // TODO: [1] DRY description
    let description: string | undefined = markdownStructure.content;

    // Note: Remove codeblocks
    description = description.split(/^```.*^```/gms).join('');
    //Note: Remove lists and return statement
    description = description.split(/^(?:(?:-)|(?:\d\))|(?:`?->))\s+.*$/gm).join('');
    description = spaceTrim(description);
    if (description === '') {
        description = undefined;
    }
    pipelineJson.description = description;

    const defaultModelRequirements: Partial<Writable<ModelRequirements>> = {};
    const listItems = extractAllListItemsFromMarkdown(markdownStructure.content);
    for (const listItem of listItems) {
        const command = parseCommand(listItem);

        switch (command.type) {
            case 'PIPELINE_URL':
                pipelineJson.pipelineUrl = command.pipelineUrl.href;
                break;

            case 'PROMPTBOOK_VERSION':
                pipelineJson.promptbookVersion = command.promptbookVersion;
                break;

            case 'MODEL':
                defaultModelRequirements[command.key] = command.value;
                break;

            case 'PARAMETER':
                defineParam(command);
                break;

            default:
                throw new SyntaxError(
                    `Command ${command.type} is not allowed in the head of the promptbook ONLY at the prompt template block`,
                );
        }
    }

    for (const section of markdownStructure.sections) {
        // TODO: Parse prompt template description (the content out of the codeblock and lists)

        const templateModelRequirements: Partial<Writable<ModelRequirements>> = { ...defaultModelRequirements };
        const listItems = extractAllListItemsFromMarkdown(section.content);
        let dependentParameterNames = new Set<IterableElement<PromptTemplateJson['dependentParameterNames']>>();
        let executionType: ExecutionType = 'PROMPT_TEMPLATE';
        let jokers: PromptTemplateJson['jokers'] = [];
        let postprocessing: PromptTemplateJson['postprocessing'] = [];
        let expectAmount: PromptTemplateJson['expectations'] = {};
        let expectFormat: PromptTemplateJson['expectFormat'] | undefined = undefined;

        let isExecutionTypeChanged = false;

        for (const listItem of listItems) {
            const command = parseCommand(listItem);
            switch (command.type) {
                case 'JOKER':
                    jokers.push(command.parameterName);
                    dependentParameterNames.add(command.parameterName);
                    break;
                case 'EXECUTE':
                    if (isExecutionTypeChanged) {
                        throw new SyntaxError(
                            'Execution type is already defined in the prompt template. It can be defined only once.',
                        );
                    }
                    executionType = command.executionType;
                    isExecutionTypeChanged = true;
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

                case 'EXPECT_AMOUNT':
                    // eslint-disable-next-line no-case-declarations
                    const unit = command.unit.toLowerCase() as Lowercase<ExpectationUnit>;

                    expectAmount[unit] = expectAmount[unit] || {};

                    if (command.sign === 'MINIMUM' || command.sign === 'EXACTLY') {
                        if (expectAmount[unit]!.min !== undefined) {
                            throw new SyntaxError(
                                `Already defined minumum ${
                                    expectAmount[unit]!.min
                                } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                            );
                        }
                        expectAmount[unit]!.min = command.amount;
                    } /* not else */
                    if (command.sign === 'MAXIMUM' || command.sign === 'EXACTLY') {
                        if (expectAmount[unit]!.max !== undefined) {
                            throw new SyntaxError(
                                `Already defined maximum ${
                                    expectAmount[unit]!.max
                                } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                            );
                        }
                        expectAmount[unit]!.max = command.amount;
                    }
                    break;

                case 'EXPECT_FORMAT':
                    if (expectFormat !== undefined && command.format !== expectFormat) {
                        throw new SyntaxError(
                            `Expect format is already defined to "${expectFormat}". Now you try to redefine it by "${command.format}".`,
                        );
                    }
                    expectFormat = command.format;

                    break;

                default:
                    throw new SyntaxError(
                        `Command ${command.type} is not allowed in the block of the prompt template ONLY at the head of the promptbook`,
                    );
            }
        }

        const { language, content } = extractOneBlockFromMarkdown(section.content);

        if (executionType === 'SCRIPT') {
            if (!language) {
                throw new SyntaxError('You must specify the language of the script in the prompt template');
            } else if (!SUPPORTED_SCRIPT_LANGUAGES.includes(language as ScriptLanguage)) {
                throw new SyntaxError(
                    spaceTrim(
                        (block) => `
                            Script language ${language} is not supported.

                            Supported languages are:
                            ${block(SUPPORTED_SCRIPT_LANGUAGES.join(', '))}

                        `,
                    ),
                );
            }
        }

        const lastLine = section.content.split('\n').pop()!;
        const match = /^->\s*\{(?<resultingParamName>[a-z0-9_]+)\}/im.exec(lastLine);
        if (!match || match.groups === undefined || match.groups.resultingParamName === undefined) {
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                        Invalid template - each section must end with "-> {...}"

                        Invalid section:
                        ${block(
                            // TODO: Show code of invalid sections each time + DRY
                            section.content
                                .split('\n')
                                .map((line) => `> ${line}`)
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
                executionType,
                content,
            }),
        );

        if (templateModelRequirements.modelVariant === undefined) {
            templateModelRequirements.modelVariant = 'CHAT';
        }

        const template = {
            name: titleToName(section.title),
            title: section.title,
            description,
            dependentParameterNames: Array.from(dependentParameterNames),
            executionType,
            jokers,
            postprocessing,
            expectations: expectAmount,
            expectFormat,
            modelRequirements: templateModelRequirements as ModelRequirements,
            contentLanguage: executionType === 'SCRIPT' ? (language as ScriptLanguage) : undefined,
            content,
            resultingParameterName,
        };

        if (executionType !== 'PROMPT_TEMPLATE') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (template as any).modelRequirements;
        }

        pipelineJson.promptTemplates.push(template);
    }

    // =============================================================
    return pipelineJson;
}

/**
 * TODO: Report here line/column of error
 * TODO: Use spaceTrim more effectively
 * TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
 */
