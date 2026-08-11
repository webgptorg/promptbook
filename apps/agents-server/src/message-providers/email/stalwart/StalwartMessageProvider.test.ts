jest.mock('../smtp/SmtpMessageProvider', () => ({
    SmtpMessageProvider: jest.fn(),
}));

import { resolveStalwartMessageProviderConfiguration } from './StalwartMessageProvider';

describe('resolveStalwartMessageProviderConfiguration', () => {
    it('returns no provider configuration without the shared SMTP password', () => {
        expect(resolveStalwartMessageProviderConfiguration({})).toBeNull();
    });

    it('uses the bundled Stalwart submission listener by default', () => {
        expect(
            resolveStalwartMessageProviderConfiguration({
                PTBK_STALWART_SMTP_PASSWORD: 'secret',
            }),
        ).toEqual({
            host: '127.0.0.1',
            port: 465,
            isSecure: true,
            isTlsCertificateValidationEnabled: false,
            username: null,
            password: 'secret',
        });
    });

    it('repairs the legacy local port 587 configuration retained by existing VPS processes', () => {
        expect(
            resolveStalwartMessageProviderConfiguration({
                PTBK_STALWART_SMTP_HOST: 'localhost',
                PTBK_STALWART_SMTP_PORT: '587',
                PTBK_STALWART_SMTP_SECURE: 'false',
                PTBK_STALWART_SMTP_TLS_REJECT_UNAUTHORIZED: 'false',
                PTBK_STALWART_SMTP_PASSWORD: 'secret',
            }),
        ).toEqual({
            host: 'localhost',
            port: 465,
            isSecure: true,
            isTlsCertificateValidationEnabled: false,
            username: null,
            password: 'secret',
        });
    });

    it('preserves an explicitly configured remote SMTP submission endpoint', () => {
        expect(
            resolveStalwartMessageProviderConfiguration({
                PTBK_STALWART_SMTP_HOST: 'smtp.example.com',
                PTBK_STALWART_SMTP_PORT: '587',
                PTBK_STALWART_SMTP_SECURE: 'false',
                PTBK_STALWART_SMTP_TLS_REJECT_UNAUTHORIZED: 'true',
                PTBK_STALWART_SMTP_USERNAME: ' bridge@example.com ',
                PTBK_STALWART_SMTP_PASSWORD: 'secret',
            }),
        ).toEqual({
            host: 'smtp.example.com',
            port: 587,
            isSecure: false,
            isTlsCertificateValidationEnabled: true,
            username: 'bridge@example.com',
            password: 'secret',
        });
    });
});
