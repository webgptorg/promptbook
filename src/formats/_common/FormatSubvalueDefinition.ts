import type { Promisable } from 'type-fest';
import type { Parameters } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import type { string_parameter_name } from '../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { empty_object } from '../../utils/organization/empty_object';

/**
 * @@@
 */
export type FormatSubvalueDefinition<TValue extends string, TSettings extends empty_object> = {
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
     * Maps values
     *
     * For example, if you have a JSON object and you want to map all values to uppercase
     * Or iterate over all CSV cells @@@
     */
    mapValues(
        value: TValue,
        outputParameterName: string_parameter_name,
        settings: TSettings,
        mapCallback: (subvalues: Parameters, index: number) => Promisable<string>,
    ): Promise<string>;
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
