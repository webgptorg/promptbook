import { createHmac, createPublicKey, createVerify, timingSafeEqual, type KeyObject } from 'crypto';
import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../../../../../../src/errors/EnvironmentMismatchError';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { normalizeServerDomain } from '../../../utils/serverRegistry';

/**
 * Header containing the SendGrid webhook signature.
 */
export const SENDGRID_INBOUND_PARSE_SIGNATURE_HEADER_NAME = 'x-twilio-email-event-webhook-signature';

/**
 * Header containing the SendGrid webhook timestamp.
 */
export const SENDGRID_INBOUND_PARSE_TIMESTAMP_HEADER_NAME = 'x-twilio-email-event-webhook-timestamp';

/**
 * Environment variable containing the SendGrid ECDSA public verification key.
 */
const SENDGRID_INBOUND_PARSE_PUBLIC_KEY_ENV_NAME = 'SENDGRID_INBOUND_PARSE_PUBLIC_KEY';

/**
 * Environment variable containing the HMAC shared secret for custom SendGrid webhook signing deployments.
 */
const SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET_ENV_NAME = 'SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET';

/**
 * Environment variable containing the comma-separated hosts allowed to receive SendGrid Inbound Parse callbacks.
 */
const SENDGRID_INBOUND_PARSE_HOSTS_ENV_NAME = 'SENDGRID_INBOUND_PARSE_HOSTS';

/**
 * Maximum accepted age or future skew for signed SendGrid Inbound Parse webhook requests.
 */
const SENDGRID_INBOUND_PARSE_REPLAY_WINDOW_SECONDS = 5 * 60;

/**
 * One resolved SendGrid Inbound Parse signing configuration.
 */
type SendgridInboundParseSigningConfiguration =
    | {
          /**
           * Current SendGrid signature verification mode.
           */
          readonly type: 'ecdsa';

          /**
           * Public key configured in SendGrid for signed webhooks.
           */
          readonly publicKey: KeyObject;
      }
    | {
          /**
           * Current SendGrid signature verification mode.
           */
          readonly type: 'hmac';

          /**
           * Shared webhook secret used to verify the signature.
           */
          readonly secret: string;
      };

/**
 * Verifies one SendGrid Inbound Parse webhook request before the multipart body is parsed.
 *
 * SendGrid signs the raw request body, so callers must pass the exact bytes
 * received by the route. Parsing `multipart/form-data` before this check can
 * normalize boundaries or file parts and break signature verification.
 *
 * @param headers - Incoming request headers.
 * @param rawBody - Exact request body bytes.
 * @param now - Current time used for timestamp replay-window checks.
 * @throws {EnvironmentMismatchError} When required SendGrid security configuration is missing or invalid.
 * @throws {NotAllowed} When the request host, timestamp, or signature is not accepted.
 *
 * @private internal utility of SendGrid inbound email provider
 */
export function verifySendgridInboundParseWebhook(headers: Headers, rawBody: Buffer, now = new Date()): void {
    assertSendgridInboundParseHostAllowed(headers);

    const timestamp = headers.get(SENDGRID_INBOUND_PARSE_TIMESTAMP_HEADER_NAME);
    const signature = headers.get(SENDGRID_INBOUND_PARSE_SIGNATURE_HEADER_NAME);

    if (!timestamp || !signature) {
        throw new NotAllowed('Missing required SendGrid Inbound Parse webhook signature headers.');
    }

    assertSendgridInboundParseTimestampAllowed(timestamp, now);

    const signingConfiguration = resolveSendgridInboundParseSigningConfiguration();
    const isSignatureValid =
        signingConfiguration.type === 'ecdsa'
            ? verifySendgridInboundParseEcdsaSignature({
                  publicKey: signingConfiguration.publicKey,
                  rawBody,
                  signature,
                  timestamp,
              })
            : verifySendgridInboundParseHmacSignature({
                  rawBody,
                  secret: signingConfiguration.secret,
                  signature,
                  timestamp,
              });

    if (!isSignatureValid) {
        throw new NotAllowed('SendGrid Inbound Parse webhook signature verification failed.');
    }
}

/**
 * Maps SendGrid webhook verification errors to HTTP statuses.
 *
 * @param error - Error thrown while processing the webhook.
 * @returns HTTP status code.
 *
 * @private internal utility of SendGrid inbound email route
 */
export function resolveSendgridInboundParseWebhookErrorStatus(error: unknown): number {
    if (error instanceof EnvironmentMismatchError) {
        return 503;
    }

    if (error instanceof NotAllowed) {
        return 403;
    }

    return 500;
}

/**
 * Verifies an ECDSA signed SendGrid webhook payload.
 */
function verifySendgridInboundParseEcdsaSignature(options: {
    readonly publicKey: KeyObject;
    readonly rawBody: Buffer;
    readonly signature: string;
    readonly timestamp: string;
}): boolean {
    const signatureBuffer = decodeBase64Buffer(options.signature);
    if (!signatureBuffer) {
        return false;
    }

    const verifier = createVerify('sha256');
    verifier.update(options.timestamp);
    verifier.update(options.rawBody);
    verifier.end();

    return verifier.verify(options.publicKey, signatureBuffer);
}

/**
 * Verifies a HMAC signed SendGrid webhook payload using constant-time comparison.
 */
function verifySendgridInboundParseHmacSignature(options: {
    readonly rawBody: Buffer;
    readonly secret: string;
    readonly signature: string;
    readonly timestamp: string;
}): boolean {
    const receivedSignature = decodeBase64Buffer(options.signature);
    if (!receivedSignature) {
        return false;
    }

    const expectedSignature = createHmac('sha256', options.secret)
        .update(options.timestamp)
        .update(options.rawBody)
        .digest();

    if (receivedSignature.length !== expectedSignature.length) {
        return false;
    }

    return timingSafeEqual(receivedSignature, expectedSignature);
}

/**
 * Resolves and validates the configured SendGrid webhook signing mode.
 */
function resolveSendgridInboundParseSigningConfiguration(): SendgridInboundParseSigningConfiguration {
    const publicKey = process.env[SENDGRID_INBOUND_PARSE_PUBLIC_KEY_ENV_NAME]?.trim();
    if (publicKey) {
        return {
            type: 'ecdsa',
            publicKey: createSendgridInboundParsePublicKey(publicKey),
        };
    }

    const secret = process.env[SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET_ENV_NAME]?.trim();
    if (secret) {
        return {
            type: 'hmac',
            secret,
        };
    }

    throw new EnvironmentMismatchError(
        spaceTrim(`
            Missing required SendGrid Inbound Parse webhook signing configuration.

            The Agents Server verifies \`/api/emails/incoming/sendgrid\` before
            parsing the multipart body or inserting an inbound \`EMAIL\` message.

            **Fix:** set \`${SENDGRID_INBOUND_PARSE_PUBLIC_KEY_ENV_NAME}\` to the
            public verification key from SendGrid Signed Webhook settings. If your
            deployment uses a shared-secret HMAC variant, set
            \`${SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET_ENV_NAME}\` instead.
        `),
    );
}

/**
 * Converts the SendGrid public key configuration into a Node.js public key.
 */
function createSendgridInboundParsePublicKey(publicKey: string): KeyObject {
    const normalizedPublicKey = publicKey.replace(/\\n/gu, '\n').trim();

    try {
        if (normalizedPublicKey.includes('BEGIN PUBLIC KEY')) {
            return createPublicKey(normalizedPublicKey);
        }

        return createPublicKey({
            key: Buffer.from(normalizedPublicKey, 'base64'),
            format: 'der',
            type: 'spki',
        });
    } catch (error) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Invalid \`${SENDGRID_INBOUND_PARSE_PUBLIC_KEY_ENV_NAME}\` environment variable.

                Expected the ECDSA public verification key copied from SendGrid
                Signed Webhook settings, either as PEM or base64-encoded SPKI DER.

                ${error instanceof Error ? error.message : String(error)}
            `),
        );
    }
}

/**
 * Rejects requests that were delivered through an unconfigured host.
 */
function assertSendgridInboundParseHostAllowed(headers: Headers): void {
    const requestHost = resolveSendgridInboundParseRequestHost(headers);
    const allowedHosts = resolveAllowedSendgridInboundParseHosts();

    if (!requestHost || !allowedHosts.includes(requestHost)) {
        throw new NotAllowed(
            spaceTrim(`
                SendGrid Inbound Parse webhook host is not allowed.

                Expected one of \`${allowedHosts.join('`, `')}\`.
            `),
        );
    }
}

/**
 * Resolves configured SendGrid Inbound Parse hostnames.
 */
function resolveAllowedSendgridInboundParseHosts(): Array<string> {
    const rawHosts = process.env[SENDGRID_INBOUND_PARSE_HOSTS_ENV_NAME]?.trim();
    if (!rawHosts) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Missing required \`${SENDGRID_INBOUND_PARSE_HOSTS_ENV_NAME}\` environment variable.

                Configure the hostnames that are allowed to receive SendGrid
                Inbound Parse webhook callbacks, separated by commas.
            `),
        );
    }

    const allowedHosts = uniqueStrings(
        rawHosts
            .split(',')
            .map((rawHost) => normalizeServerDomain(rawHost))
            .filter((host): host is string => Boolean(host)),
    );

    if (allowedHosts.length === 0) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Environment variable \`${SENDGRID_INBOUND_PARSE_HOSTS_ENV_NAME}\`
                does not contain any valid hostnames.
            `),
        );
    }

    return allowedHosts;
}

/**
 * Resolves the externally visible request host from trusted proxy headers.
 */
function resolveSendgridInboundParseRequestHost(headers: Headers): string | null {
    const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || headers.get('host') || '';

    return normalizeServerDomain(host);
}

/**
 * Rejects stale or far-future webhook timestamps to reduce replay risk.
 */
function assertSendgridInboundParseTimestampAllowed(timestamp: string, now: Date): void {
    if (!/^\d+$/u.test(timestamp)) {
        throw new NotAllowed('SendGrid Inbound Parse webhook timestamp is invalid.');
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isSafeInteger(timestampSeconds)) {
        throw new NotAllowed('SendGrid Inbound Parse webhook timestamp is invalid.');
    }

    const nowSeconds = Math.floor(now.getTime() / 1000);
    const ageSeconds = Math.abs(nowSeconds - timestampSeconds);
    if (ageSeconds > SENDGRID_INBOUND_PARSE_REPLAY_WINDOW_SECONDS) {
        throw new NotAllowed('SendGrid Inbound Parse webhook timestamp is outside the accepted replay window.');
    }
}

/**
 * Decodes a strict base64 value into bytes.
 */
function decodeBase64Buffer(value: string): Buffer | null {
    const normalizedValue = value.trim();
    if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(normalizedValue) || normalizedValue.length % 4 !== 0) {
        return null;
    }

    return Buffer.from(normalizedValue, 'base64');
}

/**
 * Returns unique strings while preserving input order.
 */
function uniqueStrings(values: ReadonlyArray<string>): Array<string> {
    return [...new Set(values)];
}
