import { spaceTrim } from 'spacetrim';

/**
 * Wallet service id used by USE EMAIL for SMTP credentials.
 */
export const USE_EMAIL_SMTP_WALLET_SERVICE = 'smtp';

/**
 * Wallet key used by USE EMAIL for SMTP credentials.
 */
export const USE_EMAIL_SMTP_WALLET_KEY = 'use-email-smtp-credentials';

/**
 * JSON schema expected in ACCESS_TOKEN secret for USE EMAIL SMTP credentials.
 */
export const USE_EMAIL_SMTP_WALLET_SECRET_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['host', 'port', 'secure', 'username', 'password'],
    properties: {
        host: {
            type: 'string',
            description: 'SMTP hostname, for example smtp.example.com',
        },
        port: {
            type: 'integer',
            minimum: 1,
            maximum: 65535,
            description: 'SMTP port, for example 587',
        },
        secure: {
            type: 'boolean',
            description: 'Use TLS from start (typically true for 465, false for 587)',
        },
        username: {
            type: 'string',
            description: 'SMTP account username',
        },
        password: {
            type: 'string',
            description: 'SMTP account password or app password',
        },
        fromAddress: {
            type: 'string',
            format: 'email',
            description: 'Optional default sender override',
        },
    },
} as const;

/**
 * Multiline JSON example for USE EMAIL SMTP secret payload.
 */
export const USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE = spaceTrim(`
    {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "username": "agent@example.com",
      "password": "..."
    }
`);

/**
 * Builds user-facing guidance for missing USE EMAIL SMTP wallet credentials.
 */
export function createUseEmailSmtpWalletMissingCredentialMessage(defaultFromAddress?: string): string {
    const defaultSenderLine = defaultFromAddress
        ? `Default sender from commitment: ${defaultFromAddress}`
        : undefined;

    return [
        'SMTP credentials are missing in wallet.',
        `Add ACCESS_TOKEN record with service "${USE_EMAIL_SMTP_WALLET_SERVICE}" and key "${USE_EMAIL_SMTP_WALLET_KEY}".`,
        'Put SMTP JSON into Secret, for example:',
        USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE,
        defaultSenderLine,
    ]
        .filter((line): line is string => Boolean(line))
        .join('\n');
}
