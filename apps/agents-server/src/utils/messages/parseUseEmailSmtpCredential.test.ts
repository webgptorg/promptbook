import { describe, expect, it } from '@jest/globals';
import { parseUseEmailSmtpCredential } from './parseUseEmailSmtpCredential';

describe('parseUseEmailSmtpCredential', () => {
    it('parses JSON credential payload', () => {
        const credential = parseUseEmailSmtpCredential(
            '{"host":"smtp.example.com","port":587,"secure":false,"username":"agent@example.com","password":"secret","fromAddress":"agent@example.com"}',
        );

        expect(credential).toEqual({
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'agent@example.com',
            password: 'secret',
            fromAddress: 'agent@example.com',
        });
    });

    it('parses SMTP URL credential payload', () => {
        const credential = parseUseEmailSmtpCredential(
            'smtp://agent%40example.com:secret@smtp.example.com:587?from=agent@example.com',
        );

        expect(credential).toEqual({
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'agent@example.com',
            password: 'secret',
            fromAddress: 'agent@example.com',
        });
    });

    it('throws on invalid payload', () => {
        expect(() => parseUseEmailSmtpCredential('invalid-payload')).toThrow(
            'SMTP credential must be valid JSON or smtp:// URL.',
        );
    });
});
