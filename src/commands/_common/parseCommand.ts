import { spaceTrim } from 'spacetrim';
import { SyntaxError } from '../../errors/SyntaxError';
import { ExecutionTypes } from '../../types/ExecutionTypes';
import { MODEL_VARIANTS } from '../../types/ModelRequirements';
import { EXPECTATION_UNITS } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { removeMarkdownFormatting } from '../../utils/markdown/removeMarkdownFormatting';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { parseNumber } from './parseNumber';
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
} from './types/Command';

/**
 * Parses one line of ul/ol to command
 *
 * @returns parsed command object
 * @throws {SyntaxError} if the command is invalid
 *
 * @private within the pipelineStringToJson
 */
export function parseCommand(raw: string_markdown_text): Command {
    if (raw.includes('\n') || raw.includes('\r')) {
        throw new SyntaxError('Command can not contain new line characters:');
    }

    let normalized = raw.trim();
    normalized = normalized.split('`').join('');
    normalized = normalized.split('"').join('');
    normalized = normalized.split("'").join('');
    normalized = normalized.split('~').join('');
    normalized = normalized.split('[').join('');
    normalized = normalized.split(']').join('');
    normalized = normalized.split('(').join('');
    normalized = normalized.split(')').join('');
    normalized = normalizeTo_SCREAMING_CASE(normalized);
    normalized = normalized.split('DIALOGUE').join('DIALOG');

    const items = raw
        .split(' ')
        .map((part) => part.trim())
        .filter((item) => item !== '')
        .filter((item) => !/^PTBK$/i.test(item))
        .filter((item) => !/^PIPELINE$/i.test(item))
        .filter((item) => !/^PROMPTBOOK$/i.test(item))
        .map(removeMarkdownFormatting);

    if (
        normalized.startsWith('URL') ||
        normalized.startsWith('PTBK_URL') ||
        normalized.startsWith('PTBKURL') ||
        normalized.startsWith('PIPELINE_URL') ||
        normalized.startsWith('PIPELINEURL') ||
        normalized.startsWith('PROMPTBOOK_URL') ||
        normalized.startsWith('PROMPTBOOKURL') ||
        normalized.startsWith('HTTPS')
    ) {
        if (!(items.length === 2 || (items.length === 1 && normalized.startsWith('HTTPS')))) {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PIPELINE_URL command:

                        - ${raw}
                    `,
                ),
            );
        }

        const pipelineUrlString = items.pop()!;
        const pipelineUrl = new URL(pipelineUrlString);

        if (pipelineUrl.protocol !== 'https:') {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PIPELINE_URL command:

                        - ${raw}

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

                        - ${raw}

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
    } else if (normalized.startsWith('PROMPTBOOK_VERSION') || normalized.startsWith('PTBK_VERSION')) {
        if (items.length !== 2) {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid PROMPTBOOK_VERSION command:

                        - ${raw}
                    `,
                ),
            );
        }

        const promptbookVersion = items.pop()!;
        // TODO: Validate version

        return {
            type: 'PROMPTBOOK_VERSION',
            promptbookVersion,
        } satisfies PromptbookVersionCommand;
    } else if (
        normalized.startsWith('EXECUTE') ||
        normalized.startsWith('EXEC') ||
        normalized.startsWith('PROMPT_DIALOG') ||
        normalized.startsWith('SIMPLE_TEMPLATE')
    ) {
        const executionTypes = ExecutionTypes.filter((executionType) => normalized.includes(executionType));

        if (executionTypes.length !== 1) {
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                        Unknown execution type in command:

                        - ${raw}

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
    } else if (normalized.startsWith('MODEL')) {
        // TODO: Make this more elegant and dynamically
        if (normalized.startsWith('MODEL_VARIANT')) {
            if (normalized === 'MODEL_VARIANT_CHAT') {
                return {
                    type: 'MODEL',
                    key: 'modelVariant',
                    value: 'CHAT',
                } satisfies ModelCommand;
            } else if (normalized === 'MODEL_VARIANT_COMPLETION') {
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

                            - ${raw}

                            Supported variants are:
                            ${block(MODEL_VARIANTS.map((variantName) => `- ${variantName}`).join('\n'))}
                        `,
                    ),
                );
            }
        }
        if (normalized.startsWith('MODEL_NAME')) {
            return {
                type: 'MODEL',
                key: 'modelName',
                value: items.pop()!,
            } satisfies ModelCommand;
        } else {
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                          Unknown model key in command:

                          - ${raw}

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
        normalized.startsWith('PARAM') ||
        normalized.startsWith('INPUT_PARAM') ||
        normalized.startsWith('OUTPUT_PARAM') ||
        raw.startsWith('{') ||
        raw.startsWith(
            '> {',
        ) /* <- Note: This is a bit hack to parse return parameters defined at the end of each section */
    ) {
        const parametersMatch = raw.match(
            /\{(?<parameterName>[a-z0-9_]+)\}[^\S\r\n]*(?<parameterDescription>.*)$/im,
        );

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new SyntaxError(
                spaceTrim(
                    `
                        Invalid parameter in command:

                        - ${raw}
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

                        - ${raw}
                    `,
                ),
            );
        }

        let isInput = normalized.startsWith('INPUT');
        let isOutput = normalized.startsWith('OUTPUT');

        if (raw.startsWith('> {')) {
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
    } else if (normalized.startsWith('JOKER')) {
        if (items.length !== 2) {
            throw new SyntaxError(
                spaceTrim(
                    `
                Invalid JOKER command:

                - ${raw}
            `,
                ),
            );
        }

        const parametersMatch = (items.pop() || '').match(/^\{(?<parameterName>[a-z0-9_]+)\}$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new SyntaxError(
                spaceTrim(
                    `
                      Invalid parameter in command:

                      - ${raw}
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
    } else if (normalized.startsWith('POSTPROCESS') || normalized.startsWith('POST_PROCESS')) {
        if (items.length !== 2) {
            throw new SyntaxError(
                spaceTrim(
                    `
                Invalid POSTPROCESSING command:

                - ${raw}
            `,
                ),
            );
        }

        const functionName = items.pop()!;

        return {
            type: 'POSTPROCESS',
            functionName,
        } satisfies PostprocessCommand;
    } else if (normalized.startsWith('EXPECT_JSON')) {
        return {
            type: 'EXPECT_FORMAT',
            format: 'JSON',
        } satisfies ExpectFormatCommand;

        // [🥤]
    } else if (normalized.startsWith('EXPECT')) {
        try {
            items.shift();

            let sign: ExpectAmountCommand['sign'];
            const signRaw = items.shift()!;
            if (/^exact/i.test(signRaw)) {
                sign = 'EXACTLY';
            } else if (/^min/i.test(signRaw)) {
                sign = 'MINIMUM';
            } else if (/^max/i.test(signRaw)) {
                sign = 'MAXIMUM';
            } else {
                throw new SyntaxError(`Invalid sign "${signRaw}", expected EXACTLY, MIN or MAX`);
            }

            const amountRaw = items.shift()!;
            const amount = parseNumber(amountRaw);
            if (amount < 0) {
                throw new SyntaxError('Amount must be positive number or zero');
            }
            if (amount !== Math.floor(amount)) {
                throw new SyntaxError('Amount must be whole number');
            }

            const unitRaw = items.shift()!;
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

                  - ${raw}
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

                    - ${raw}

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
