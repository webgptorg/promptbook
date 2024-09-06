import { describe, expect, it } from '@jest/globals';
import { string_parameter_name } from '../../../types/typeAliases';

describe('how `validateParameterName` works', () => {
    it('should work with simple valid parameter names', () => {
        expect(validateParameterName(`name`)).toBe('name');
        expect(validateParameterName(`name1`)).toBe('name1');
        expect(validateParameterName(`firstName`)).toBe('firstName');
        expect(validateParameterName(`name_1`)).toBe('name_1');
    });

    it('should unwrap names', () => {
        expect(validateParameterName(`{name}`)).toBe('name');
        expect(validateParameterName('`{name}`')).toBe('name');
    });

    it('should NOT work with reserved parameter name', () => {
        expect(validateParameterName(`{content}`)).toThrowError(/* !!!!!! */);
        // <- TODO: !!!!!! Test dynamic
    });

    it('should NOT work with invalid parameter name', () => {
        expect(validateParameterName(``)).toThrowError(/* !!!!!! */);
        expect(validateParameterName(`-`)).toThrowError(/* !!!!!! */);
        expect(validateParameterName(`{}`)).toThrowError(/* !!!!!! */);
        expect(validateParameterName(`name}`)).toThrowError(/* !!!!!! */);
        expect(validateParameterName(`{{name}}`)).toThrowError(/* !!!!!! */);
    });
});

/**
 * Function `validateParameterName` will @@@
 *
 * @private within the repository <- TODO: !!! Take just one of
 * @public exported from @@@
 */
export function validateParameterName(parameterName: string): string_parameter_name {}

/**
 * TODO: !!! Extract `validateParameterName` to separate file
 */
