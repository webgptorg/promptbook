import { DEFAULT_PASSWORD_GENERATOR_OPTIONS, generateSecurePassword } from './generateSecurePassword';

describe('generateSecurePassword', () => {
    it('generates a password with the secure default configuration', () => {
        const password = generateSecurePassword();

        expect(password).toHaveLength(16);
        expect(password).toMatch(/^[A-Za-z0-9!@#$%^&*+\-_=~]+$/);
        expect(password).toMatch(/[A-Z]/);
        expect(password).toMatch(/[a-z]/);
        expect(password).toMatch(/[0-9]/);
        expect(password).toMatch(/[!@#$%^&*+\-_=~]/);
    });

    it('uses only the requested character categories', () => {
        const password = generateSecurePassword({
            ...DEFAULT_PASSWORD_GENERATOR_OPTIONS,
            length: 8,
            isUppercaseLettersIncluded: false,
            isLowercaseLettersIncluded: false,
            isSpecialCharactersIncluded: false,
        });

        expect(password).toHaveLength(8);
        expect(password).toMatch(/^[23456789]+$/);
    });

    it('returns an empty password for configurations that cannot include every selected category', () => {
        const password = generateSecurePassword({
            ...DEFAULT_PASSWORD_GENERATOR_OPTIONS,
            length: 3,
        });

        expect(password).toBe('');
    });
});
