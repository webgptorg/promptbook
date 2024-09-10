import type { string_mime_type, string_name } from '../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { empty_object } from '../../utils/organization/empty_object';
import type { FormatSubvalueDefinition } from './FormatSubvalueDefinition';

/**
 * A format definition is a set of functions that define how to validate, heal and convert response from LLM
 *
 * @@@ Describe setting vs schema
 *
 * @see https://github.com/webgptorg/promptbook/discussions/36
 * @private still in development [🏢]
 */
export type FormatDefinition<
    TValue extends TPartialValue,
    TPartialValue extends string,
    TSettings extends empty_object,
    TSchema extends empty_object,
> = {
    /**
     * The name of the format used in .ptbk.md files
     *
     * @sample "JSON"
     */
    readonly formatName: string_name & string_SCREAMING_CASE;

    /**
     * Aliases for the `formatName`
     */
    readonly aliases?: Array<string_name & string_SCREAMING_CASE>;

    /**
     * The mime type of the format (if any)
     *
     * @sample "application/json"
     */
    readonly mimeType?: string_mime_type;

    /**
     * Check if a value is fully valid
     *
     * @param value The value to check, for example "{\"foo\": true}"
     * @param schema Optional schema to do extra validation
     */
    isValid(value: string, settings?: TSettings, schema?: TSchema): value is TValue;

    /**
     * Check if a first part of a value is valid
     *
     * @see https://github.com/webgptorg/promptbook/discussions/37
     *
     * @param partialValue Partial value to check, for example "{\"foo\": t"
     * @param schema Optional schema to do extra validation
     */
    canBeValid(partialValue: string, settings?: TSettings, schema?: TSchema): partialValue is TPartialValue;

    /**
     * Heal a value to make it valid if possible
     *
     * Note: This make sense in context of LLMs that often returns slightly invalid values
     * @see https://github.com/webgptorg/promptbook/discussions/31
     *
     * @param value The value to heal, for example "{foo: true}"
     * @param scheme
     * @throws {Error} If the value cannot be healed
     */
    heal(value: string, settings?: TSettings, scheme?: TSchema): TValue;

    /**
     * @@@
     */
    readonly subvalueDefinitions: Array<FormatSubvalueDefinition<TValue, TSettings>>;
};

/**
 * TODO: [🧠][🦥] Better (less confusing) name for "cell" / "subvalue" / "subparameter"
 * TODO: [♏] Add some prepare hook to modify prompt according to the format
 * TODO: [🍓]`name` and `aliases` should be UPPERCASE only and interpreted as case-insensitive (via normalization)
 * TODO: [🍓][👨‍⚖️] Compute TPartialValue dynamically - PartialString<TValue>
 * TODO: [🍓][🧠] Should execution tools be aviable to heal, canBeValid and isValid?
 * TODO: [🍓][🧠] llm Provider Bindings
 * TODO: [🍓][🔼] Export via some package
 */
