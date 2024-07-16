import { spaceTrim } from 'spacetrim';
import { SyntaxError } from '../../errors/SyntaxError';
import type {
    Command,
    ExecuteCommand,
    ExpectAmountCommand,
    ExpectCommand,
    ExpectFormatCommand,
    JokerCommand,
    ModelCommand,
    ParameterCommand,
    PostprocessCommand,
    PromptbookUrlCommand,
    PromptbookVersionCommand,
} from '../../types/Command';
import { ExecutionTypes } from '../../types/ExecutionTypes';
import { MODEL_VARIANTS } from '../../types/ModelRequirements';
import { EXPECTATION_UNITS } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { parseNumber } from './parseNumber';

/**
 * Parses one line of ul/ol to command
 *
 * @returns parsed command object
 * @throws {SyntaxError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export function parseCommand(listItem: string_markdown_text): Command {
    if (listItem.includes('\n') || listItem.includes('\r')) {
        throw new SyntaxError('Command can not contain new line characters:');
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
        .filter((item) => !/^PIPELINE$/i.test(item))
        .filter((item) => !/^PROMPTBOOK$/i.test(item))
        .map(removeMarkdownFormatting);

    if (
        type.startsWith('URL') ||
        type.startsWith('PTBK_URL') ||
        type.startsWith('PTBKURL') ||
        type.startsWith('PIPELINE_URL') ||
        type.startsWith('PIPELINEURL') ||
        type.startsWith('PROMPTBOOK_URL') ||
        type.startsWith('PROMPTBOOKURL') ||
        type.startsWith('HTTPS')
    ) {
        if (!(listItemParts.length === 2 || (listItemParts.length === 1 && type.startsWith('HTTPS')))) {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PIPELINE_URL command:

                        - ${listItem}
                    `,
                ),
            );
        }

        const pipelineUrlString = listItemParts.pop()!;
        const pipelineUrl = new URL(pipelineUrlString);

        if (pipelineUrl.protocol !== 'https:') {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PIPELINE_URL command:

                        - ${listItem}

                        Protocol must be HTTPS
                    `,
                ),
            );
        }

        if (pipelineUrl.hash !== '') {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PIPELINE_URL command:

                        - ${listItem}

                        URL must not contain hash
                        Hash is used for identification of the prompt template in the pipeline
                    `,
                ),
            );
        }

        return {
            type: 'PIPELINE_URL',
            pipelineUrl,
        } satisfies PromptbookUrlCommand;
    } else if (type.startsWith('PROMPTBOOK_VERSION') || type.startsWith('PTBK_VERSION')) {
        if (listItemParts.length !== 2) {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PROMPTBOOK_VERSION command:

                        - ${listItem}
                    `,
                ),
            );
        }

        const promptbookVersion = listItemParts.pop()!;
        // TODO: Validate version

        return {
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion,
        } satisfies PromptbookVersionCommand;
    } else if (
        type.startsWith('EXECUTE') ||
        type.startsWith('EXEC') ||
        type.startsWith('PROMPT_DIALOG') ||
        type.startsWith('SIMPLE_TEMPLATE')
    ) {
        const executionTypes = ExecutionTypes.filter((executionType) => type.includes(executionType));

        if (executionTypes.length !== 1) {
            throw new SyntaxError(
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
                // <- Note: [🤖]
            } else {
                throw new SyntaxError(
                    spaceTrim(
                        (block) => `
                            Unknown model variant in command:

                            - ${listItem}

                            Supported variants are:
                            ${block(MODEL_VARIANTS.map((variantName) => `- ${variantName}`).join('\n'))}
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
            throw new SyntaxError(
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
            throw new SyntaxError(
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
            throw new SyntaxError(
                spaceTrim(
                    `
                        Parameter {${parameterName}} can not contain another parameter in description:

                        - ${listItem}
                    `,
                ),
            );
        }

        let isInput = type.startsWith('INPUT');
        let isOutput = type.startsWith('OUTPUT');

        if (listItem.startsWith('> {')) {
            isInput = false;
            isOutput = false;
        }

        return {
            type: 'PARAMETER',
            parameterName,
            parameterDescription: parameterDescription.trim() || null,
            isInput,
            isOutput,
        } satisfies ParameterCommand;
    } else if (type.startsWith('JOKER')) {
        if (listItemParts.length !== 2) {
            throw new SyntaxError(
                spaceTrim(
                    `
                Invalid JOKER command:

                - ${listItem}
            `,
                ),
            );
        }

        const parametersMatch = (listItemParts.pop() || '').match(/^\{(?<parameterName>[a-z0-9_]+)\}$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new SyntaxError(
                spaceTrim(
                    `
                      Invalid parameter in command:

                      - ${listItem}
                  `,
                ),
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { parameterName } = parametersMatch.groups as any;

        return {
            type: 'JOKER',
            parameterName,
        } satisfies JokerCommand;
    } else if (type.startsWith('POSTPROCESS') || type.startsWith('POST_PROCESS')) {
        if (listItemParts.length !== 2) {
            throw new SyntaxError(
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
    } else if (type.startsWith('EXPECT_JSON')) {
        return {
            type: 'EXPECT_FORMAT',
            format: 'JSON',
        } satisfies ExpectFormatCommand;

        // [🥤]
    } else if (type.startsWith('EXPECT')) {
        try {
            listItemParts.shift();

            let sign: ExpectAmountCommand['sign'];
            const signRaw = listItemParts.shift()!;
            if (/^exact/i.test(signRaw)) {
                sign = 'EXACTLY';
            } else if (/^min/i.test(signRaw)) {
                sign = 'MINIMUM';
            } else if (/^max/i.test(signRaw)) {
                sign = 'MAXIMUM';
            } else {
                throw new SyntaxError(`Invalid sign "${signRaw}", expected EXACTLY, MIN or MAX`);
            }

            const amountRaw = listItemParts.shift()!;
            const amount = parseNumber(amountRaw);
            if (amount < 0) {
                throw new SyntaxError('Amount must be positive number or zero');
            }
            if (amount !== Math.floor(amount)) {
                throw new SyntaxError('Amount must be whole number');
            }

            const unitRaw = listItemParts.shift()!;
            let unit: ExpectAmountCommand['unit'] | undefined = undefined;
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
                        throw new SyntaxError(`Ambiguous unit "${unitRaw}"`);
                    }
                    unit = existingUnit;
                }
            }
            if (unit === undefined) {
                throw new SyntaxError(`Invalid unit "${unitRaw}"`);
            }

            return {
                type: 'EXPECT_AMOUNT',
                sign,
                unit,
                amount,
            } satisfies ExpectCommand;
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            throw new SyntaxError(
                spaceTrim(
                    `
                  Invalid EXPECT command; ${error.message}:

                  - ${listItem}
              `,
                ),
            );
        }

        /*
    } else if (type.startsWith('__________________')) {
        // <- [🥻] Insert here when making new command
    */
    } else {
        throw new SyntaxError(
            spaceTrim(
                `
                    Unknown command:

                    - ${listItem}

                    Supported commands are:
                    - PIPELINE_URL <url>
                    - PROMPTBOOK_VERSION <version>
                    - EXECUTE PROMPT TEMPLATE
                    - EXECUTE SIMPLE TEMPLATE
                    -         SIMPLE TEMPLATE
                    - EXECUTE SCRIPT
                    - EXECUTE PROMPT_DIALOG'
                    -         PROMPT_DIALOG'
                    - MODEL NAME <name>
                    - MODEL VARIANT <"Chat"|"Completion">
                    - INPUT  PARAM {<name>} <description>
                    - OUTPUT PARAM {<name>} <description>
                    - POSTPROCESS \`{functionName}\`
                    - JOKER {<name>}
                    - EXPECT JSON
                    - EXPECT <"Exactly"|"Min"|"Max"> <number> <"Chars"|"Words"|"Sentences"|"Paragraphs"|"Pages">

                `,
            ), // <- [🥻] Insert here when making new command
        );
    }
}
