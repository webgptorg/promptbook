import { normalizeTo_SCREAMING_CASE } from 'n12';
import spaceTrim from 'spacetrim';
import { string_markdown_text } from '.././types/typeAliases';
import { Command } from '../types/Command';
import { ExecutionTypes } from '../types/ExecutionTypes';
import { removeMarkdownFormatting } from '../utils/markdown/removeMarkdownFormatting';

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
        };
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
        };
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
        };
    } else if (type.startsWith('USE')) {
        // TODO: Make this more elegant and dynamically
        if (type.includes('CHAT')) {
            return {
                type: 'USE',
                key: 'variant',
                value: 'CHAT',
            };
        } else if (type.includes('COMPLETION')) {
            return {
                type: 'USE',
                key: 'variant',
                value: 'COMPLETION',
            };
        } else {
            throw new Error(
                spaceTrim(
                    (block) => `
                          Unknown variant in command:

                          - ${listItem}

                          Supported variants are:
                          ${block(['CHAT', 'COMPLETION'].join(', '))}
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
        };
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
        };
    } else {
        throw new Error(
            spaceTrim(
                `
                    Unknown command:

                    - ${listItem}

                    Supported commands are:
                    - Execute
                    - Use
                    - Parameter
                    - Input parameter
                    - Output parameter
                    - PTBK Version
                `,
            ),
        );
    }
}
