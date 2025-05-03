import type { Promisable } from 'type-fest';
import type { Parameters, string_name, string_parameter_name } from '../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { empty_object } from '../../utils/organization/empty_object';

/**
 * Defines how to extract or map subvalues from a main value in a specific format (e.g., cells from CSV, items from JSON array).
 * Used for iterating or transforming structured data in pipeline tasks.
 */
export type FormatSubvalueParser<TValue extends string, TSettings extends empty_object> = {
    /**
     * The name of the format used in .book.md files
     *
     * @example "CELL"
     */
    readonly subvalueName: string_name & string_SCREAMING_CASE;

    /**
     * Aliases for the `subvalueName`
     */
    readonly aliases?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

    /**
     * Maps or transforms subvalues from the main value. For example, iterates over all CSV cells or JSON array items.
     *
     * @param options - Options for mapping, including callbacks for progress and value transformation.
     * @returns The final mapped string result.
     */
    mapValues(options: FormatSubvalueParserMapValuesOptions<TValue, TSettings>): Promise<string>;
};

/**
 * Options for mapping or extracting subvalues from a main value using a FormatSubvalueParser.
 */
export type FormatSubvalueParserMapValuesOptions<TValue extends string, TSettings extends empty_object> = {
    readonly value: TValue;
    readonly outputParameterName: string_parameter_name;
    readonly settings: TSettings;
    mapCallback: (subvalues: Parameters, index: number) => Promisable<TValue>;
    onProgress(partialResultString: TValue): Promisable<void>;
};

/*
TODO: Maybe implement `extractValues` and make helper util which automatically creates `extractValues` from `mapValues`
    > /**
    >  * Parses just the values and removes structural information
    >  *
    >  * Note: This is useful when you want to combine format expectations with counting words, characters,...
    >  *
    >  * @param value The value to check, for example "{\"name\": "John Smith"}"
    >  * @example "{\"name\": "John Smith"}" -> ["John Smith"]
    >  * /
    > extractValues(value: TValue): Parameters;
*/

/**
 * Note: [👩🏾‍🤝‍🧑🏽]
 */
