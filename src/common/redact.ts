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

/**
 * Keys that must never be persisted as trace payloads, independently of a value's recognizable shape.
 *
 * @private shared trace privacy
 */
const TRACE_SECRET_FIELD = /^(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|authorization|cookie|set-cookie|clipboard(?:text|content|contents)?|recoveryWords)$/i;

/**
 * Content-bearing fields of browser/desktop operations (their values are available live, not in Git evidence).
 *
 * @private shared trace privacy
 */
const TRACE_TOOL_CONTENT_FIELD = /^(?:text|value|values|content|contents|data|html|expression|script|code|result|output|response|error)$/i;

/**
 * Browser/desktop tool names after optional MCP server prefixes.
 *
 * @private shared trace privacy
 */
const TRACE_PRIVATE_TOOL = /(?:^|__)(?:browser|computer)_[a-z0-9_]+$/i;

/**
 * Explicit omission marker: absence of content is never presented as a complete tool transcript.
 *
 * @private shared trace privacy
 */
const TRACE_CONTENT_OMITTED = '[content omitted from persistent trace]';

/**
 * Sanitizes structured trace data before serialization. Browser/desktop payloads and image bytes remain available to
 * the live harness, but persistent evidence keeps only technical metadata. This is not an arbitrary document/PII
 * classifier; ordinary task prose still needs the existing secret-value redactor and the project's trace policy.
 *
 * @private shared trace privacy
 */
export function sanitizeTraceValue(value: unknown): unknown {
    return new TraceSanitizer().value(value);
}

/**
 * Stateful persistence-only sanitizer, tracking split tool-use/result events without changing live harness traffic.
 * One instance belongs to one task trace, so a Claude tool_result can be matched to its earlier browser/desktop call.
 *
 * @private shared trace privacy
 */
export class TraceSanitizer {
    private readonly privateCalls = new Set<string>();

    /** Sanitizes one structured event without mutating its source. */
    public value(value: unknown): unknown {
        return this.walk(value, false, 0);
    }

    /** Sanitizes raw JSON-lines output before it can be rendered or saved; free text receives shape-based redaction. */
    public text(text: string): string {
        return text.split('\n').map((line) => {
            try {
                const parsed: unknown = JSON.parse(line);
                return JSON.stringify(this.value(parsed));
            } catch {
                return redactTraceText(line);
            }
        }).join('\n');
    }

    /** Bounded recursive traversal, including JSON encoded inside harness argument strings. */
    private walk(value: unknown, privateTool: boolean, depth: number): unknown {
        if (depth > 50) return '[trace nesting bound reached]';
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^[\[{]/.test(trimmed)) {
                try { return JSON.stringify(this.walk(JSON.parse(trimmed) as unknown, privateTool, depth + 1)); } catch { /* ordinary text */ }
            }
            return redactTraceText(value);
        }
        if (value === null || typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map((item) => this.walk(item, privateTool, depth + 1));
        const record = value as Record<string, unknown>;
        const name = [record.name, record.tool, record.tool_name].find((part) => typeof part === 'string' && TRACE_PRIVATE_TOOL.test(part));
        const id = [record.id, record.call_id, record.tool_use_id].find((part): part is string => typeof part === 'string');
        const isPrivate = privateTool || typeof name === 'string' || (typeof record.tool_use_id === 'string' && this.privateCalls.has(record.tool_use_id)) || (typeof record.call_id === 'string' && this.privateCalls.has(record.call_id));
        if (typeof name === 'string' && id) this.privateCalls.add(id);
        const image = record.type === 'image' || record.type === 'image_url' || (typeof record.mimeType === 'string' && record.mimeType.startsWith('image/')) || (typeof record.mime_type === 'string' && record.mime_type.startsWith('image/'));
        return Object.fromEntries(Object.entries(record).map(([key, item]) => {
            if (TRACE_SECRET_FIELD.test(key)) return [key, REDACTED];
            if (image && (key === 'data' || key === 'blob' || key === 'base64' || key === 'url' || key === 'image_url' || key === 'source')) {
                return [key, typeof item === 'string' && key === 'data' ? `[image data, ${item.length} base64 characters omitted]` : TRACE_CONTENT_OMITTED];
            }
            if (isPrivate && TRACE_TOOL_CONTENT_FIELD.test(key)) return [key, TRACE_CONTENT_OMITTED];
            return [key, this.walk(item, isPrivate, depth + 1)];
        }));
    }
}

/**
 * Removes inline image data and secret-bearing URL credentials/query values from otherwise ordinary diagnostic text.
 *
 * @private shared trace privacy
 */
export function redactTraceText(text: string): string {
    return text
        .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\r\n]+/gi, '[image data omitted]')
        .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@')
        .replace(/([?&#](?:access_token|refresh_token|id_token|token|api[_-]?key|password|passwd|secret|code|session|auth|key|pair)=)[^&#\s"']+/gi, '$1[REDACTED]');
}
