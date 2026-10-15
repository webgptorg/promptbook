/**
 * Environment variable names whose values are treated as secrets.
 */
const SECRET_NAME_PATTERN = /(TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|CREDENTIAL|COOKIE|SESSION|AUTH)/i;

/**
 * Minimal length of an environment value to be redacted verbatim (short values cause false positives).
 */
const MIN_SECRET_LENGTH = 8;

/**
 * Well-known credential shapes redacted regardless of their source.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
    /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g,
    /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\bAIza[0-9A-Za-z_-]{30,}/g,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    /(\bBearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi,
    /(\b(?:password|passwd|token|secret|api[_-]?key)\s*[=:]\s*)["']?[^\s"']{6,}/gi,
    /(#pair=)[A-Za-z0-9_-]{8,}/g,
];

/**
 * Placeholder written instead of a secret.
 *
 * @private shared redaction helper
 */
export const REDACTED = '[REDACTED]';

/**
 * Collects secret values from an environment.
 *
 * @private shared redaction helper
 */
export function secretValuesFromEnvironment(env: NodeJS.ProcessEnv = process.env): string[] {
    const values: string[] = [];
    for (const [name, value] of Object.entries(env)) {
        if (value && value.length >= MIN_SECRET_LENGTH && SECRET_NAME_PATTERN.test(name)) values.push(value);
    }
    return values;
}

/**
 * Creates a redactor removing known secret values and credential-shaped strings.
 *
 * @private shared redaction helper
 */
export function createRedactor(extraSecrets: readonly string[] = [], env: NodeJS.ProcessEnv = process.env): (text: string) => string {
    const secrets = [...new Set([...secretValuesFromEnvironment(env), ...extraSecrets.filter((value) => value.length >= MIN_SECRET_LENGTH)])].sort(
        (a, b) => b.length - a.length,
    );
    return (text: string): string => {
        let result = text;
        for (const secret of secrets) {
            if (result.includes(secret)) result = result.split(secret).join(REDACTED);
        }
        for (const pattern of SECRET_PATTERNS) {
            result = result.replace(pattern, (match: string, prefix?: unknown) => (typeof prefix === 'string' && match.startsWith(prefix) ? `${prefix}${REDACTED}` : REDACTED));
        }
        return result;
    };
}

/**
 * Redacts a text with the default (environment-based) redactor.
 *
 * @private shared redaction helper
 */
export function redact(text: string): string {
    return createRedactor()(text);
}
