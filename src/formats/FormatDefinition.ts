import { string_mime_type, string_name } from '../types/typeAliases';

export type FormatDefinition<TValue extends TPartialValue, TPartialValue extends string, TScheme extends object> = {
    readonly name: string_name;
    readonly mimeType: string_mime_type;
    isValid(value: string, scheme?: TScheme): value is TValue;
    canBeValid(partialValue: string, scheme?: TScheme): partialValue is TPartialValue;
    heal(value: string, scheme?: TScheme): TValue;
};

/**
 *
 * TODO: [🧠] llm Provider Bindings
 */
