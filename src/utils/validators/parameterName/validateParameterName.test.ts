import { describe, expect, it } from '@jest/globals';
import { validateParameterName } from './validateParameterName';

describe('how `validateParameterName` works', () => {
    it('should work with simple valid parameter names', () => {
        expect(validateParameterName(`name`)).toBe('name');
        expect(validateParameterName(`name1`)).toBe('name1');
        expect(validateParameterName(`firstName`)).toBe('firstName');
    });

    it('should unwrap names', () => {
        expect(validateParameterName(`{name}`)).toBe('name');
        expect(validateParameterName('`{name}`')).toBe('name');
    });

    it('should normalize parameter names', () => {
        expect(validateParameterName(`name_1`)).toBe('name1');
        expect(validateParameterName(`name 1`)).toBe('name1');
        expect(validateParameterName(`NAME_FOO_BAR`)).toBe('nameFooBar');
        expect(validateParameterName(`NAME FOO BAR`)).toBe('nameFooBar');
        expect(validateParameterName(`NameFooBar`)).toBe('nameFooBar');
        expect(validateParameterName(`jméno`)).toBe('jmeno');
        expect(validateParameterName(`JMÉNO`)).toBe('jmeno');
    });

    // TODO: !!!!! Test different notations /name/ -> {name}, [name] -> {name},... etc

    it('should NOT work with reserved parameter name', () => {
        expect(() => validateParameterName(`{content}`)).toThrowError(/{content} is a reserved parameter name/);
        // <- TODO: !!!!!! Test more
    });

    it('should NOT work with invalid parameter name', () => {
        expect(() => validateParameterName(``)).toThrowError(/Parameter name cannot be empty/i);
        expect(() => validateParameterName(`-`)).toThrowError(/Parameter name cannot be empty/i);
        expect(() => validateParameterName(`{}`)).toThrowError(/Parameter name cannot be empty/i);
        expect(() => validateParameterName(`name}`)).toThrowError(/Parameter name cannot contain braces/i);
        expect(() => validateParameterName(`{{name}}`)).toThrowError(/Parameter name cannot contain braces/i);
        expect(() => validateParameterName(`name]`)).toThrowError(/Parameter name cannot contain braces/i);
        expect(() => validateParameterName(`{(name}}`)).toThrowError(/Parameter name cannot contain braces/i);
    });
});
