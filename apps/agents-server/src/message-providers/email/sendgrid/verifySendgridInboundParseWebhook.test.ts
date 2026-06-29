import { createHmac, createSign, generateKeyPairSync } from 'crypto';
import { afterEach, describe, expect, it } from '@jest/globals';
import { EnvironmentMismatchError } from '../../../../../../src/errors/EnvironmentMismatchError';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import {
    SENDGRID_INBOUND_PARSE_SIGNATURE_HEADER_NAME,
    SENDGRID_INBOUND_PARSE_TIMESTAMP_HEADER_NAME,
    verifySendgridInboundParseWebhook,
} from './verifySendgridInboundParseWebhook';

/**
 * Environment variables mutated by SendGrid Inbound Parse webhook tests.
 */
const TEST_ENVIRONMENT_VARIABLE_NAMES = [
    'SENDGRID_INBOUND_PARSE_PUBLIC_KEY',
    'SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET',
    'SENDGRID_INBOUND_PARSE_HOSTS',
] as const;

/**
 * Original environment values restored after each test.
 */
const ORIGINAL_ENVIRONMENT = Object.fromEntries(
    TEST_ENVIRONMENT_VARIABLE_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof TEST_ENVIRONMENT_VARIABLE_NAMES)[number], string | undefined>;

/**
 * Stable timestamp used by webhook verification tests.
 */
const TEST_TIMESTAMP = '1800000000';

/**
 * Stable current time matching `TEST_TIMESTAMP`.
 */
const TEST_NOW = new Date(Number(TEST_TIMESTAMP) * 1000);

/**
 * Raw webhook body used by signing tests.
 */
const TEST_RAW_BODY = Buffer.from('raw multipart body');

describe('verifySendgridInboundParseWebhook', () => {
    afterEach(() => {
        for (const name of TEST_ENVIRONMENT_VARIABLE_NAMES) {
            restoreEnvironmentVariable(name, ORIGINAL_ENVIRONMENT[name]);
        }
    });

    it('accepts a valid ECDSA SendGrid signature for the configured host', () => {
        const { privateKey, publicKey } = generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            privateKeyEncoding: {
                format: 'pem',
                type: 'pkcs8',
            },
            publicKeyEncoding: {
                format: 'der',
                type: 'spki',
            },
        });

        process.env.SENDGRID_INBOUND_PARSE_PUBLIC_KEY = publicKey.toString('base64');
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        expect(() =>
            verifySendgridInboundParseWebhook(
                createSignedHeaders({
                    host: 'parse.example.com',
                    signature: createEcdsaSignature({
                        privateKey,
                        rawBody: TEST_RAW_BODY,
                        timestamp: TEST_TIMESTAMP,
                    }),
                    timestamp: TEST_TIMESTAMP,
                }),
                TEST_RAW_BODY,
                TEST_NOW,
            ),
        ).not.toThrow();
    });

    it('accepts a valid HMAC signature using constant-time compatible bytes', () => {
        process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET = 'test-sendgrid-secret';
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        expect(() =>
            verifySendgridInboundParseWebhook(
                createSignedHeaders({
                    host: 'parse.example.com',
                    signature: createHmacSignature({
                        rawBody: TEST_RAW_BODY,
                        secret: 'test-sendgrid-secret',
                        timestamp: TEST_TIMESTAMP,
                    }),
                    timestamp: TEST_TIMESTAMP,
                }),
                TEST_RAW_BODY,
                TEST_NOW,
            ),
        ).not.toThrow();
    });

    it('rejects signatures that do not match the raw body', () => {
        process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET = 'test-sendgrid-secret';
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        expect(() =>
            verifySendgridInboundParseWebhook(
                createSignedHeaders({
                    host: 'parse.example.com',
                    signature: createHmacSignature({
                        rawBody: Buffer.from('different body'),
                        secret: 'test-sendgrid-secret',
                        timestamp: TEST_TIMESTAMP,
                    }),
                    timestamp: TEST_TIMESTAMP,
                }),
                TEST_RAW_BODY,
                TEST_NOW,
            ),
        ).toThrow(NotAllowed);
    });

    it('rejects requests outside the replay window', () => {
        process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET = 'test-sendgrid-secret';
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        expect(() =>
            verifySendgridInboundParseWebhook(
                createSignedHeaders({
                    host: 'parse.example.com',
                    signature: createHmacSignature({
                        rawBody: TEST_RAW_BODY,
                        secret: 'test-sendgrid-secret',
                        timestamp: TEST_TIMESTAMP,
                    }),
                    timestamp: TEST_TIMESTAMP,
                }),
                TEST_RAW_BODY,
                new Date((Number(TEST_TIMESTAMP) + 301) * 1000),
            ),
        ).toThrow(NotAllowed);
    });

    it('rejects requests delivered through an unconfigured host', () => {
        process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET = 'test-sendgrid-secret';
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        expect(() =>
            verifySendgridInboundParseWebhook(
                createSignedHeaders({
                    host: 'public.example.com',
                    signature: createHmacSignature({
                        rawBody: TEST_RAW_BODY,
                        secret: 'test-sendgrid-secret',
                        timestamp: TEST_TIMESTAMP,
                    }),
                    timestamp: TEST_TIMESTAMP,
                }),
                TEST_RAW_BODY,
                TEST_NOW,
            ),
        ).toThrow(NotAllowed);
    });

    it('refuses requests when signing configuration is missing', () => {
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        expect(() =>
            verifySendgridInboundParseWebhook(
                createSignedHeaders({
                    host: 'parse.example.com',
                    signature: 'MEUCIQD=',
                    timestamp: TEST_TIMESTAMP,
                }),
                TEST_RAW_BODY,
                TEST_NOW,
            ),
        ).toThrow(EnvironmentMismatchError);
    });
});

/**
 * Creates headers used by SendGrid webhook verification tests.
 */
function createSignedHeaders(options: {
    readonly host: string;
    readonly signature: string;
    readonly timestamp: string;
}): Headers {
    return new Headers({
        host: options.host,
        [SENDGRID_INBOUND_PARSE_SIGNATURE_HEADER_NAME]: options.signature,
        [SENDGRID_INBOUND_PARSE_TIMESTAMP_HEADER_NAME]: options.timestamp,
    });
}

/**
 * Creates one ECDSA signature matching SendGrid's `timestamp + rawBody` verification payload.
 */
function createEcdsaSignature(options: {
    readonly privateKey: string;
    readonly rawBody: Buffer;
    readonly timestamp: string;
}): string {
    const signer = createSign('sha256');
    signer.update(options.timestamp);
    signer.update(options.rawBody);
    signer.end();

    return signer.sign(options.privateKey).toString('base64');
}

/**
 * Creates one base64 HMAC signature for `timestamp + rawBody`.
 */
function createHmacSignature(options: {
    readonly rawBody: Buffer;
    readonly secret: string;
    readonly timestamp: string;
}): string {
    return createHmac('sha256', options.secret).update(options.timestamp).update(options.rawBody).digest('base64');
}

/**
 * Restores one environment variable to its original value.
 */
function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}
