import spaceTrim from 'spacetrim';
import { REPLACING_NONCE } from '../constants';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { string_prompt } from '../types/typeAliases';
import type { really_unknown } from '../utils/organization/really_unknown';
import { templateParameters } from '../utils/parameters/templateParameters';
import { valueToString } from '../utils/parameters/valueToString';

import { ParameterEscaping } from './prompt-notation/helpers/ParameterEscaping';
import { ParameterNaming } from './prompt-notation/helpers/ParameterNaming';
import { ParameterSection } from './prompt-notation/helpers/ParameterSection';

/**
 * Prompt string wrapper to retain prompt context across interpolations.
 *
 * @public exported from `@promptbook/utils`
 */
export class PromptString extends String {
    /**
     * @param value Prompt content.
     */
    public constructor(value: string_prompt) {
        super(value);
    }

    /**
     * Returns the prompt as a primitive string.
     */
    public override toString(): string_prompt {
        return super.toString();
    }

    /**
     * Returns the prompt as a primitive string for implicit coercion.
     */
    public override valueOf(): string_prompt {
        return super.valueOf() as string_prompt;
    }

    /**
     * Ensures template literal coercion returns the raw string.
     */
    public [Symbol.toPrimitive](): string_prompt {
        return this.toString();
    }
}

/**
 * Checks whether a value is a PromptString instance.
 *
 * @param value Candidate value.
 */
function isPromptString(value: really_unknown): value is PromptString {
    return value instanceof PromptString;
}

/**
 * Tag function for notating a prompt as template literal
 *
 * Note: There are 3 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 2) `promptTemplate` alias for `prompt`
 * 3) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @param strings
 * @param values
 * @returns prompt content wrapped as a PromptString
 * @public exported from `@promptbook/utils`
 */
export function prompt(strings: TemplateStringsArray, ...values: Array<really_unknown>): PromptString {
    if (values.length === 0) {
        return new PromptString(spaceTrim(strings.join('')));
    }

    const stringsWithHiddenParameters: string[] = strings.map((stringsItem: string) =>
        ParameterEscaping.hideBrackets(stringsItem),
    );

    const parameterMetadata = values.map((value: really_unknown) => {
        const isPrompt: boolean = isPromptString(value);
        const stringValue: string = isPrompt ? (value as PromptString).toString() : valueToString(value);
        const isInline: boolean = isPrompt ? true : ParameterEscaping.shouldInlineParameterValue(stringValue);
        const jsonValue: string | null =
            !isPrompt && !isInline ? ParameterEscaping.normalizeJsonString(stringValue) : null;

        return { isPrompt, stringValue, isInline, jsonValue };
    });

    const parameterNames: string[] = ParameterNaming.buildParameterNames(
        parameterMetadata.map((entry) => entry.stringValue),
    );

    const parameterEntries = parameterMetadata.map((entry, index) => {
        const name: string = parameterNames[index] ?? `${index + 1}`;
        const promptMarker: string = `${REPLACING_NONCE}prompt-${index}`;
        const parameterMarker: string = `${REPLACING_NONCE}parameter-${index}`;
        const templateValue: string = entry.isPrompt
            ? promptMarker
            : entry.isInline
            ? ParameterEscaping.escapePromptParameterValue(entry.stringValue, { includeBraces: false })
            : parameterMarker;

        return {
            name,
            stringValue: entry.stringValue,
            jsonValue: entry.jsonValue,
            isPrompt: entry.isPrompt,
            isInline: entry.isInline,
            promptMarker,
            parameterMarker,
            templateValue,
        };
    });
    const parameters: Record<string, string> = Object.fromEntries(
        parameterEntries.map((entry) => [entry.name, entry.templateValue]),
    );
    const parameterNamesOrdered: string[] = parameterEntries.map((entry) => entry.name);

    // Combine strings and values
    let pipelineString = stringsWithHiddenParameters.reduce((result, stringsItem, i) => {
        const parameterName = parameterNamesOrdered[i];
        return parameterName === undefined
            ? `${result}${stringsItem}`
            : `${result}${stringsItem}${ParameterSection.formatParameterPlaceholder(parameterName)}`;
    }, '');

    pipelineString = spaceTrim(pipelineString);

    try {
        pipelineString = templateParameters(pipelineString, parameters);
    } catch (error) {
        if (!(error instanceof PipelineExecutionError)) {
            throw error;
        }

        console.error({ pipelineString, parameters, parameterNames: parameterNamesOrdered, error });
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Internal error in prompt template literal
                  
                    ${block(JSON.stringify({ strings, values }, null, 4))}}
                  
                `,
            ),
        );
    }

    pipelineString = ParameterEscaping.restoreBrackets(pipelineString);

    for (const entry of parameterEntries) {
        if (entry.isPrompt) {
            pipelineString = pipelineString.split(entry.promptMarker).join(entry.stringValue);
            continue;
        }

        if (!entry.isInline) {
            pipelineString = pipelineString
                .split(entry.parameterMarker)
                .join(ParameterSection.formatParameterPlaceholder(entry.name));
        }
    }

    const structuredParameters = parameterEntries.filter((entry) => !entry.isPrompt && !entry.isInline);

    if (structuredParameters.length > 0) {
        const parameterItems: Array<{ name: string; value: string; jsonValue: string | null }> =
            structuredParameters.map((entry) => ({
                name: entry.name,
                value: entry.stringValue,
                jsonValue: entry.jsonValue,
            }));

        pipelineString = `${pipelineString}\n\n${ParameterSection.buildParametersSection(parameterItems)}`;
    }

    return new PromptString(pipelineString);
}

/**
 * Tag function for notating a prompt as template literal
 *
 * Note: There are 3 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 2) `promptTemplate` alias for `prompt`
 * 3) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @alias prompt
 * @public exported from `@promptbook/utils`
 */
export const promptTemplate = prompt;

/**
 * TODO: Maybe split into multiple files
 * TODO: [🧠][🈴] Where is the best location for this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
