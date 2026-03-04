import { isValidEmail } from '../../../../../src/utils/validators/email/isValidEmail';
import type { SmtpMessageProviderConfiguration } from '../../message-providers/email/smtp/SmtpMessageProvider';

/**
 * Normalized SMTP credential payload expected in wallet secret for USE EMAIL.
 */
export type UseEmailSmtpCredential = SmtpMessageProviderConfiguration & {
    fromAddress?: string;
};

/**
 * Parses one SMTP credential payload from wallet secret.
 *
 * Supported formats:
 * - JSON object: `{ "host": "...", "port": 587, "secure": false, "username": "...", "password": "...", "fromAddress": "agent@example.com" }`
 * - SMTP URL: `smtp://username:password@smtp.example.com:587?from=agent@example.com`
 */
export function parseUseEmailSmtpCredential(rawCredential: string): UseEmailSmtpCredential {
    const trimmedCredential = rawCredential.trim();
    if (!trimmedCredential) {
        throw new Error('SMTP credential is empty.');
    }

    if (trimmedCredential.startsWith('smtp://') || trimmedCredential.startsWith('smtps://')) {
        return parseUseEmailSmtpCredentialFromUrl(trimmedCredential);
    }

    return parseUseEmailSmtpCredentialFromJson(trimmedCredential);
}

/**
 * Parses SMTP credential from JSON payload.
 */
function parseUseEmailSmtpCredentialFromJson(rawCredential: string): UseEmailSmtpCredential {
    let parsedCredential: unknown;
    try {
        parsedCredential = JSON.parse(rawCredential);
    } catch {
        throw new Error('SMTP credential must be valid JSON or smtp:// URL.');
    }

    if (!parsedCredential || typeof parsedCredential !== 'object') {
        throw new Error('SMTP credential JSON must be an object.');
    }

    const credentialObject = parsedCredential as Record<string, unknown>;

    const host = parseRequiredString(credentialObject.host, 'host');
    const port = parseRequiredPort(credentialObject.port);
    const secure = parseRequiredBoolean(credentialObject.secure, 'secure');
    const username = parseRequiredString(credentialObject.username, 'username');
    const password = parseRequiredString(credentialObject.password, 'password');
    const fromAddress = parseOptionalString(credentialObject.fromAddress);

    if (fromAddress && !isValidEmail(fromAddress)) {
        throw new Error('SMTP credential `fromAddress` must be a valid email.');
    }

    return {
        host,
        port,
        secure,
        username,
        password,
        ...(fromAddress ? { fromAddress } : {}),
    };
}

/**
 * Parses SMTP credential from URL payload.
 */
function parseUseEmailSmtpCredentialFromUrl(rawCredential: string): UseEmailSmtpCredential {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(rawCredential);
    } catch {
        throw new Error('SMTP credential URL is invalid.');
    }

    const isSecure = parsedUrl.protocol === 'smtps:';
    if (parsedUrl.protocol !== 'smtp:' && parsedUrl.protocol !== 'smtps:') {
        throw new Error('SMTP credential URL must use smtp:// or smtps:// protocol.');
    }

    const username = decodeURIComponent(parsedUrl.username || '');
    const password = decodeURIComponent(parsedUrl.password || '');
    if (!username) {
        throw new Error('SMTP credential URL must include username.');
    }
    if (!password) {
        throw new Error('SMTP credential URL must include password.');
    }

    const host = parsedUrl.hostname.trim();
    if (!host) {
        throw new Error('SMTP credential URL must include host.');
    }

    const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : isSecure ? 465 : 587;
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        throw new Error('SMTP credential URL contains invalid port.');
    }

    const fromAddress = parseOptionalString(parsedUrl.searchParams.get('from') || undefined);
    if (fromAddress && !isValidEmail(fromAddress)) {
        throw new Error('SMTP credential URL `from` query value must be a valid email.');
    }

    return {
        host,
        port,
        secure: isSecure,
        username,
        password,
        ...(fromAddress ? { fromAddress } : {}),
    };
}

/**
 * Parses one required text field.
 */
function parseRequiredString(value: unknown, fieldName: string): string {
    const parsedValue = parseOptionalString(value);
    if (!parsedValue) {
        throw new Error(`SMTP credential field "${fieldName}" is required.`);
    }
    return parsedValue;
}

/**
 * Parses one optional text field.
 */
function parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}

/**
 * Parses one required port value.
 */
function parseRequiredPort(value: unknown): number {
    const parsedPort =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && value.trim()
              ? Number.parseInt(value, 10)
              : Number.NaN;

    if (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
        throw new Error('SMTP credential field "port" must be an integer between 1 and 65535.');
    }

    return parsedPort;
}

/**
 * Parses one required boolean value.
 */
function parseRequiredBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value !== 'boolean') {
        throw new Error(`SMTP credential field "${fieldName}" must be boolean.`);
    }

    return value;
}
