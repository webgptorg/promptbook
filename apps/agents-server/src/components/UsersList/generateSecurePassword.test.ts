import { generateSecurePassword } from './generateSecurePassword';

describe('generateSecurePassword', () => {
    it('generates a password with the expected length and secure alphabet', () => {
        const password = generateSecurePassword();

        expect(password).toHaveLength(20);
        expect(password).toMatch(/^[A-Za-z0-9!@#$%^&*+\-_=~]+$/);
    });
});
