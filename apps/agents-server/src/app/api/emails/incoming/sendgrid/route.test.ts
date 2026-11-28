import { createHmac } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { $getTableName } from '../../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../../database/$provideSupabaseForServer';
import { parseInboundSendgridEmail } from '../../../../../message-providers/email/sendgrid/parseInboundSendgridEmail';
import {
    SENDGRID_INBOUND_PARSE_SIGNATURE_HEADER_NAME,
    SENDGRID_INBOUND_PARSE_TIMESTAMP_HEADER_NAME,
} from '../../../../../message-providers/email/sendgrid/verifySendgridInboundParseWebhook';
import { POST } from './route';

jest.mock('../../../../../database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('../../../../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

jest.mock('../../../../../message-providers/email/sendgrid/parseInboundSendgridEmail', () => ({
    parseInboundSendgridEmail: jest.fn(),
}));

/**
 * Original SendGrid Inbound Parse route environment values.
 */
const ORIGINAL_ENVIRONMENT = {
    SENDGRID_INBOUND_PARSE_PUBLIC_KEY: process.env.SENDGRID_INBOUND_PARSE_PUBLIC_KEY,
    SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET: process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET,
    SENDGRID_INBOUND_PARSE_HOSTS: process.env.SENDGRID_INBOUND_PARSE_HOSTS,
};

/**
 * Stable timestamp used by route signature tests.
 */
const TEST_TIMESTAMP = String(Math.floor(Date.now() / 1000));

/**
 * Mocked table-name resolver used by route tests.
 */
const getTableNameMock = $getTableName as jest.MockedFunction<typeof $getTableName>;

/**
 * Mocked Supabase provider used by route tests.
 */
const provideSupabaseForServerMock = $provideSupabaseForServer as jest.MockedFunction<typeof $provideSupabaseForServer>;

/**
 * Mocked SendGrid raw email parser used by route tests.
 */
const parseInboundSendgridEmailMock = parseInboundSendgridEmail as jest.MockedFunction<
    typeof parseInboundSendgridEmail
>;

describe('POST /api/emails/incoming/sendgrid', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        process.env.SENDGRID_INBOUND_PARSE_PUBLIC_KEY = '';
        process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET = 'test-sendgrid-secret';
        process.env.SENDGRID_INBOUND_PARSE_HOSTS = 'parse.example.com';

        getTableNameMock.mockResolvedValue('Message');
        provideSupabaseForServerMock.mockReturnValue(createSupabaseInsertMock());
        parseInboundSendgridEmailMock.mockResolvedValue({
            attachments: [],
            cc: [],
            channel: 'EMAIL',
            content: 'Hello',
            direction: 'INBOUND',
            recipients: ['support@parse.example.com'],
            sender: 'alice@example.com',
            subject: 'Question',
        });
    });

    afterEach(() => {
        restoreEnvironmentVariable(
            'SENDGRID_INBOUND_PARSE_PUBLIC_KEY',
            ORIGINAL_ENVIRONMENT.SENDGRID_INBOUND_PARSE_PUBLIC_KEY,
        );
        restoreEnvironmentVariable(
            'SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET',
            ORIGINAL_ENVIRONMENT.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET,
        );
        restoreEnvironmentVariable('SENDGRID_INBOUND_PARSE_HOSTS', ORIGINAL_ENVIRONMENT.SENDGRID_INBOUND_PARSE_HOSTS);
    });

    it('verifies the raw multipart body before parsing and inserting the inbound email', async () => {
        const rawEmail = 'From: Alice <alice@example.com>\r\nTo: support@parse.example.com\r\n\r\nHello';
        const request = createSendgridInboundParseRequest(rawEmail);

        const response = await POST(request);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(parseInboundSendgridEmailMock).toHaveBeenCalledWith(rawEmail);
        expect(provideSupabaseForServerMock).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid signatures before parsing or inserting', async () => {
        const request = createSendgridInboundParseRequest('From: forged@example.com\r\n\r\nForged', {
            signature: 'AAAA',
        });

        const response = await POST(request);

        expect(response.status).toBe(403);
        expect(parseInboundSendgridEmailMock).not.toHaveBeenCalled();
        expect(provideSupabaseForServerMock).not.toHaveBeenCalled();
    });
});

/**
 * Creates one signed multipart SendGrid Inbound Parse request.
 */
function createSendgridInboundParseRequest(
    rawEmail: string,
    overrides: {
        readonly signature?: string;
    } = {},
): NextRequest {
    const boundary = '----promptbook-sendgrid-test-boundary';
    const rawBody = Buffer.from(
        [
            `--${boundary}`,
            'Content-Disposition: form-data; name="email"',
            '',
            rawEmail,
            `--${boundary}--`,
            '',
        ].join('\r\n'),
    );
    const signature =
        overrides.signature ||
        createHmac('sha256', 'test-sendgrid-secret').update(TEST_TIMESTAMP).update(rawBody).digest('base64');

    return new NextRequest('https://parse.example.com/api/emails/incoming/sendgrid', {
        method: 'POST',
        headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`,
            host: 'parse.example.com',
            [SENDGRID_INBOUND_PARSE_SIGNATURE_HEADER_NAME]: signature,
            [SENDGRID_INBOUND_PARSE_TIMESTAMP_HEADER_NAME]: TEST_TIMESTAMP,
        },
        body: new Uint8Array(rawBody),
    });
}

/**
 * Creates a minimal Supabase insert chain mock.
 */
function createSupabaseInsertMock() {
    return {
        from: jest.fn(() => ({
            insert: jest.fn(async () => ({
                error: null,
            })),
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
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
