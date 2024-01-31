import { normalizeTo_SCREAMING_CASE } from 'n12';
import spaceTrim from 'spacetrim';
import type { string_markdown_text } from '.././types/typeAliases';
import type {
    Command,
    ExecuteCommand,
    ExpectCommand,
    ModelCommand,
    ParameterCommand,
    PostprocessCommand,
    PtbkUrlCommand,
    PtbkVersionCommand,
} from '../types/Command';
import { ExecutionTypes } from '../types/ExecutionTypes';
import { EXPECTATION_UNITS } from '../types/PromptTemplatePipelineJson/PromptTemplateJson';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';
import { parseNumber } from '../utils/parseNumber';

/**
 * Parses one line of ul/ol to command
 */
export function parseCommand(listItem: string_markdown_text): Command {
    if (listItem.includes('\n') || listItem.includes('\r')) {
        throw new Error('Command can not contain new line characters:');
    }

    let type = listItem.trim();
    type = type.split('`').join('');
    type = type.split('"').join('');
    type = type.split("'").join('');
    type = type.split('~').join('');
    type = type.split('[').join('');
    type = type.split(']').join('');
    type = type.split('(').join('');
    type = type.split(')').join('');
    type = normalizeTo_SCREAMING_CASE(type);
    type = type.split('DIALOGUE').join('DIALOG');

    const listItemParts = listItem
        .split(' ')
        .map((part) => part.trim())
        .filter((item) => item !== '')
        .filter((item) => !/^PTBK$/i.test(item))
        .map(removeMarkdownFormatting);

    if (
        type.startsWith('URL') ||
        type.startsWith('PTBK_URL') ||
        type.startsWith('PTBKURL') ||
        type.startsWith('HTTPS')
    ) {
        if (!(listItemParts.length === 2 || (listItemParts.length === 1 && type.startsWith('HTTPS')))) {
            throw new Error(
                spaceTrim(
                    `
                        Invalid PTBK_URL command:

                        - ${listItem}
                    `,
                ),
            );
        }

        const ptbkUrlString = listItemParts.pop()!;
        const ptbkUrl = new URL(ptbkUrlString);

        if (ptbkUrl.protocol !== 'https:') {
            throw new Error(
                spaceTrim(
                    `
                        Invalid PTBK_URL command:

                        - ${listItem}

                        Protocol must be HTTPS
                    `,
                ),
            );
        }

        if (ptbkUrl.hash !== '') {
            throw new Error(
                spaceTrim(
                    `
                        Invalid PTBK_URL command:

                        - ${listItem}

                        URL must not contain hash
                        Hash is used for identification of the prompt template in the pipeline
                    `,
                ),
            );
        }

        return {
            type: 'PTBK_URL',
            ptbkUrl,
        } satisfies PtbkUrlCommand;
    } else if (type.startsWith('PTBK_VERSION')) {
        if (listItemParts.length !== 2) {
            throw new Error(
                spaceTrim(
                    `
                        Invalid PTBK_VERSION command:

                        - ${listItem}
                    `,
                ),
            );
        }

        const ptbkVersion = listItemParts.pop()!;
        // TODO: Validate version

        return {
            type: 'PTBK_VERSION',
            ptbkVersion,
        } satisfies PtbkVersionCommand;
    } else if (
        type.startsWith('EXECUTE') ||
        type.startsWith('EXEC') ||
        type.startsWith('PROMPT_DIALOG') ||
        type.startsWith('SIMPLE_TEMPLATE')
    ) {
        const executionTypes = ExecutionTypes.filter((executionType) => type.includes(executionType));

        if (executionTypes.length !== 1) {
            throw new Error(
                spaceTrim(
                    (block) => `
                        Unknown execution type in command:

                        - ${listItem}

                        Supported execution types are:
                        ${block(ExecutionTypes.join(', '))}
                    `,
                ),
            );
        }

        return {
            type: 'EXECUTE',
            executionType: executionTypes[0]!,
        } satisfies ExecuteCommand;
    } else if (type.startsWith('MODEL')) {
        // TODO: Make this more elegant and dynamically
        if (type.startsWith('MODEL_VARIANT')) {
            if (type === 'MODEL_VARIANT_CHAT') {
                return {
                    type: 'MODEL',
                    key: 'modelVariant',
                    value: 'CHAT',
                } satisfies ModelCommand;
            } else if (type === 'MODEL_VARIANT_COMPLETION') {
                return {
                    type: 'MODEL',
                    key: 'modelVariant',
                    value: 'COMPLETION',
                } satisfies ModelCommand;
            } else {
                throw new Error(
                    spaceTrim(
                        (block) => `
                            Unknown model variant in command:

                            - ${listItem}

                            Supported variants are:
                            ${block(['CHAT', 'COMPLETION'].join(', '))}
                        `,
                    ),
                );
            }
        }
        if (type.startsWith('MODEL_NAME')) {
            return {
                type: 'MODEL',
                key: 'modelName',
                value: listItemParts.pop()!,
            } satisfies ModelCommand;
        } else {
            throw new Error(
                spaceTrim(
                    (block) => `
                          Unknown model key in command:

                          - ${listItem}

                          Supported model keys are:
                          ${block(['variant', 'name'].join(', '))}

                          Example:

                          - MODEL VARIANT Chat
                          - MODEL NAME gpt-4
                    `,
                ),
            );
        }
    } else if (
        type.startsWith('PARAM') ||
        type.startsWith('INPUT_PARAM') ||
        type.startsWith('OUTPUT_PARAM') ||
        listItem.startsWith('{') ||
        listItem.startsWith(
            '> {',
        ) /* <- Note: This is a bit hack to parse return parameters defined at the end of each section */
    ) {
        const parametersMatch = listItem.match(
            /\{(?<parameterName>[a-z0-9_]+)\}[^\S\r\n]*(?<parameterDescription>.*)$/im,
        );

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new Error(
                spaceTrim(
                    `
                        Invalid parameter in command:

                        - ${listItem}
                    `,
                ),
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { parameterName, parameterDescription } = parametersMatch.groups as any;

        if (parameterDescription && parameterDescription.match(/\{(?<parameterName>[a-z0-9_]+)\}/im)) {
            throw new Error(
                spaceTrim(
                    `
                        Parameter {${parameterName}} can not contain another parameter in description:

                        - ${listItem}
                    `,
                ),
            );
        }

        const isInputParameter = type.startsWith('INPUT');

        return {
            type: 'PARAMETER',
            parameterName,
            parameterDescription: parameterDescription.trim() || null,
            isInputParameter,
        } satisfies ParameterCommand;
    } else if (type.startsWith('POSTPROCESS') || type.startsWith('POST_PROCESS')) {
        if (listItemParts.length !== 2) {
            throw new Error(
                spaceTrim(
                    `
                Invalid POSTPROCESSING command:

                - ${listItem}
            `,
                ),
            );
        }

        const functionName = listItemParts.pop()!;

        return {
            type: 'POSTPROCESS',
            functionName,
        } satisfies PostprocessCommand;
    } else if (type.startsWith('EXPECT')) {
        try {
            listItemParts.shift();

            let sign: ExpectCommand['sign'];
            const signRaw = listItemParts.shift()!;
            if (/^exact/i.test(signRaw)) {
                sign = 'EXACTLY';
            } else if (/^min/i.test(signRaw)) {
                sign = 'MINIMUM';
            } else if (/^max/i.test(signRaw)) {
                sign = 'MAXIMUM';
            } else {
                throw new Error(`Invalid sign "${signRaw}"`);
            }

            const amountRaw = listItemParts.shift()!;
            const amount = parseNumber(amountRaw);
            if (amount < 0) {
                throw new Error('Amount must be positive number or zero');
            }
            if (amount !== Math.floor(amount)) {
                throw new Error('Amount must be whole number');
            }

            const unitRaw = listItemParts.shift()!;
            let unit: ExpectCommand['unit'] | undefined = undefined;
            for (const existingUnit of EXPECTATION_UNITS) {
                let existingUnitText: string = existingUnit;

                existingUnitText = existingUnitText.substring(0, existingUnitText.length - 1);
                if (existingUnitText === 'CHARACTER') {
                    existingUnitText = 'CHAR';
                }

                if (
                    new RegExp(`^${existingUnitText.toLowerCase()}`).test(unitRaw.toLowerCase()) ||
                    new RegExp(`^${unitRaw.toLowerCase()}`).test(existingUnitText.toLowerCase())
                ) {
                    if (unit !== undefined) {
                        throw new Error(`Ambiguous unit "${unitRaw}"`);
                    }
                    unit = existingUnit;
                }
            }
            if (unit === undefined) {
                throw new Error(`Invalid unit "${unitRaw}"`);
            }

            return {
                type: 'EXPECT',
                sign,
                unit,
                amount,
            } satisfies ExpectCommand;
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            throw new Error(
                spaceTrim(
                    `
                  Invalid EXPECT command; ${error.message}:

                  - ${listItem}
              `,
                ),
            );
        }
    } else {
        throw new Error(
            spaceTrim(
                `
                    Unknown command:

                    - ${listItem}

                    Supported commands are:
                    - Execute
                    - Model
                    - Parameter
                    - Input parameter
                    - Output parameter
                    - PTBK Version
                `,
            ),
        );
    }
}
