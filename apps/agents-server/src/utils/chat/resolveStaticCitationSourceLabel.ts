/**
 * Citation metadata accepted by static source-label heuristics.
 *
 * @private utility type of Agents Server chat citation labels
 */
export type StaticCitationSourceLabelPayload = {
    /**
     * Raw citation source from the model response.
     */
    readonly source: string;

    /**
     * Optional resolved URL for the citation source.
     */
    readonly url?: string;

    /**
     * Optional title already attached to the citation.
     */
    readonly title?: string;
};

/**
 * JSON object shape used by source-label extraction.
 *
 * @private utility type of Agents Server chat citation labels
 */
type JsonRecord = Readonly<Record<string, unknown>>;

/**
 * Maximum source length parsed as JSON on the client thread.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const MAX_JSON_SOURCE_PARSE_LENGTH = 200_000;

/**
 * Number of characters inspected when checking text for binary noise.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const BINARY_TEXT_SAMPLE_LENGTH = 128;

/**
 * Field names that commonly carry a human-readable JSON source label.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const JSON_LABEL_FIELD_NAMES = [
    'title',
    'full_name',
    'fullName',
    'display_name',
    'displayName',
    'name',
    'label',
    'filename',
    'fileName',
    'file_name',
    'path',
    '_id',
    'id',
] as const;

/**
 * Field names that commonly carry a short JSON source description.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const JSON_DESCRIPTION_FIELD_NAMES = ['description', 'summary', 'text'] as const;

/**
 * Binary content types that have useful generic labels.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const BINARY_CONTENT_TYPE_LABELS: ReadonlyArray<readonly [RegExp, string]> = [
    [/^image\/jpe?g\b/i, 'JPEG image'],
    [/^image\/png\b/i, 'PNG image'],
    [/^image\/gif\b/i, 'GIF image'],
    [/^image\/webp\b/i, 'WebP image'],
    [/^image\/bmp\b/i, 'BMP image'],
    [/^image\/tiff\b/i, 'TIFF image'],
    [/^application\/zip\b/i, 'ZIP archive'],
    [/^application\/octet-stream\b/i, 'Binary source'],
];

/**
 * Byte signatures that identify common binary source payloads.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const BINARY_BYTE_SIGNATURE_LABELS: ReadonlyArray<{
    readonly bytes: ReadonlyArray<number>;
    readonly label: string;
    readonly offset?: number;
}> = [
    { bytes: [0xff, 0xd8, 0xff], label: 'JPEG image' },
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], label: 'PNG image' },
    { bytes: [0x47, 0x49, 0x46, 0x38], label: 'GIF image' },
    { bytes: [0x57, 0x45, 0x42, 0x50], label: 'WebP image', offset: 8 },
    { bytes: [0x50, 0x4b, 0x03, 0x04], label: 'ZIP archive' },
    { bytes: [0x25, 0x50, 0x44, 0x46], label: 'PDF document' },
];

/**
 * Pattern matching replacement characters produced when binary bytes are decoded as text.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const BINARY_REPLACEMENT_CHARACTER_REGEX = /\uFFFD/g;

/**
 * Control character code ranges that should not appear in readable source labels.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const BINARY_CONTROL_CHARACTER_CODE_RANGES: ReadonlyArray<readonly [number, number]> = [
    [0x00, 0x08],
    [0x0b, 0x0c],
    [0x0e, 0x1f],
];

/**
 * Pattern matching JPEG metadata markers inside incorrectly decoded binary text.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const JPEG_TEXT_SIGNATURE_REGEX = /\b(?:JFIF|Exif)\b/;

/**
 * Resolves a human-readable label without network access.
 *
 * @param citation - Citation metadata from the chat UI.
 * @returns Resolved label or null when the source should use the normal fallback.
 *
 * @private utility of Agents Server chat citation labels
 */
export function resolveStaticCitationSourceLabel(citation: StaticCitationSourceLabelPayload): string | null {
    const explicitTitle = normalizeStaticCitationLabel(citation.title);
    if (explicitTitle) {
        return explicitTitle;
    }

    return resolveJsonCitationSourceLabel(citation.source) || resolveBinaryCitationTextLabel(citation.source);
}

/**
 * Resolves a human-readable label for fetched binary bytes.
 *
 * @param bytes - Source bytes fetched from a citation URL.
 * @param contentType - Optional response content type.
 * @returns Generic binary label or null when the bytes may contain readable text.
 *
 * @private utility of Agents Server chat citation labels
 */
export function resolveBinaryCitationBytesLabel(bytes: Uint8Array, contentType?: string): string | null {
    const contentTypeLabel = resolveContentTypeBinaryLabel(contentType);
    const byteSignatureLabel = resolveByteSignatureLabel(bytes);

    if (byteSignatureLabel && byteSignatureLabel !== 'PDF document') {
        return byteSignatureLabel;
    }

    if (contentTypeLabel && contentTypeLabel !== 'Binary source') {
        return contentTypeLabel;
    }

    return byteSignatureLabel || contentTypeLabel;
}

/**
 * Extracts a useful label from JSON-like citation sources.
 *
 * @param source - Raw citation source.
 * @returns Human-readable JSON label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveJsonCitationSourceLabel(source: string): string | null {
    const jsonSource = extractJsonSourceCandidate(source);
    if (!jsonSource) {
        return null;
    }

    const parsedJson = parseJsonSourceCandidate(jsonSource);
    if (parsedJson === null) {
        return null;
    }

    return resolveJsonValueLabel(parsedJson);
}

/**
 * Extracts a JSON substring from a raw citation source.
 *
 * @param source - Raw citation source.
 * @returns JSON candidate or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function extractJsonSourceCandidate(source: string): string | null {
    const trimmedSource = source.trim();
    if (!trimmedSource) {
        return null;
    }

    if (trimmedSource.startsWith('{') || trimmedSource.startsWith('[')) {
        return trimmedSource;
    }

    const jsonStartIndex = Math.min(
        ...['{', '['].map((character) => trimmedSource.indexOf(character)).filter((index) => index >= 0),
    );

    if (!Number.isFinite(jsonStartIndex) || jsonStartIndex <= 0) {
        return null;
    }

    const prefix = trimmedSource.slice(0, jsonStartIndex).trim();
    if (/[A-Za-z0-9]/.test(prefix)) {
        return null;
    }

    return trimmedSource.slice(jsonStartIndex);
}

/**
 * Parses a JSON source candidate with a small size guard.
 *
 * @param jsonSource - JSON candidate.
 * @returns Parsed JSON value or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function parseJsonSourceCandidate(jsonSource: string): unknown | null {
    if (jsonSource.length > MAX_JSON_SOURCE_PARSE_LENGTH) {
        return null;
    }

    try {
        return JSON.parse(jsonSource);
    } catch {
        return null;
    }
}

/**
 * Resolves a display label from any JSON value.
 *
 * @param value - Parsed JSON value.
 * @returns Human-readable label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveJsonValueLabel(value: unknown): string | null {
    if (Array.isArray(value)) {
        return resolveJsonArrayLabel(value);
    }

    if (isJsonRecord(value)) {
        return resolveJsonRecordLabel(value);
    }

    return normalizeStaticCitationLabel(value);
}

/**
 * Resolves a display label from a JSON array.
 *
 * @param values - Parsed JSON array.
 * @returns Human-readable label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveJsonArrayLabel(values: ReadonlyArray<unknown>): string | null {
    const firstLabel = values.map(resolveJsonValueLabel).find((label): label is string => Boolean(label));
    if (!firstLabel) {
        return null;
    }

    const additionalCount = Math.max(0, values.length - 1);
    if (additionalCount === 0) {
        return firstLabel;
    }

    return `${firstLabel} + ${additionalCount} more`;
}

/**
 * Resolves a display label from a JSON object.
 *
 * @param record - Parsed JSON object.
 * @returns Human-readable label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveJsonRecordLabel(record: JsonRecord): string | null {
    const repositoryLabel = resolveGithubRepositoryLabel(record);
    if (repositoryLabel) {
        return repositoryLabel;
    }

    for (const fieldName of JSON_LABEL_FIELD_NAMES) {
        const label = normalizeStaticCitationLabel(record[fieldName]);
        if (label) {
            return label;
        }
    }

    return resolveUrlFieldLabel(record);
}

/**
 * Resolves a GitHub repository label from common API fields.
 *
 * @param record - Parsed JSON object.
 * @returns GitHub repository label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveGithubRepositoryLabel(record: JsonRecord): string | null {
    const fullName =
        normalizeStaticCitationLabel(record.full_name) || resolveOwnerRepositoryName(record.owner, record.name);

    if (!fullName || !isGithubRepositoryRecord(record)) {
        return null;
    }

    return appendDescription(`GitHub - ${fullName}`, resolveJsonRecordDescription(record));
}

/**
 * Checks whether a JSON object looks like a GitHub repository API payload.
 *
 * @param record - Parsed JSON object.
 * @returns True when the record is probably a GitHub repository.
 *
 * @private utility of Agents Server chat citation labels
 */
function isGithubRepositoryRecord(record: JsonRecord): boolean {
    const htmlUrl = normalizeStaticCitationLabel(record.html_url);

    return (
        Boolean(htmlUrl && htmlUrl.includes('github.com/')) ||
        typeof record.node_id === 'string' ||
        typeof record.stargazers_count === 'number'
    );
}

/**
 * Builds an owner/name label from nested GitHub owner metadata.
 *
 * @param owner - Potential owner payload.
 * @param name - Potential repository name.
 * @returns Owner/repository label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveOwnerRepositoryName(owner: unknown, name: unknown): string | null {
    if (!isJsonRecord(owner)) {
        return null;
    }

    const ownerLogin = normalizeStaticCitationLabel(owner.login);
    const repositoryName = normalizeStaticCitationLabel(name);

    return ownerLogin && repositoryName ? `${ownerLogin}/${repositoryName}` : null;
}

/**
 * Resolves a short description from common JSON fields.
 *
 * @param record - Parsed JSON object.
 * @returns Human-readable description or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveJsonRecordDescription(record: JsonRecord): string | null {
    for (const fieldName of JSON_DESCRIPTION_FIELD_NAMES) {
        const description = normalizeStaticCitationLabel(record[fieldName]);
        if (description) {
            return description;
        }
    }

    return null;
}

/**
 * Appends a description when it adds useful context.
 *
 * @param label - Base label.
 * @param description - Optional description.
 * @returns Label with description when available.
 *
 * @private utility of Agents Server chat citation labels
 */
function appendDescription(label: string, description: string | null): string {
    if (!description || label.includes(description)) {
        return label;
    }

    return `${label}: ${description}`;
}

/**
 * Resolves a readable label from URL fields in a JSON object.
 *
 * @param record - Parsed JSON object.
 * @returns URL-derived label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveUrlFieldLabel(record: JsonRecord): string | null {
    const urlValue = normalizeStaticCitationLabel(record.html_url) || normalizeStaticCitationLabel(record.url);
    if (!urlValue) {
        return null;
    }

    try {
        const url = new URL(urlValue);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        return normalizeStaticCitationLabel(pathSegments[pathSegments.length - 1]) || url.hostname;
    } catch {
        return urlValue;
    }
}

/**
 * Resolves a display label from binary text accidentally decoded into a citation source.
 *
 * @param source - Raw citation source.
 * @returns Generic binary label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveBinaryCitationTextLabel(source: string): string | null {
    const trimmedSource = source.trim();
    if (!trimmedSource || !isLikelyBinaryText(trimmedSource)) {
        return null;
    }

    if (trimmedSource.startsWith('%PDF')) {
        return 'PDF document';
    }

    if (JPEG_TEXT_SIGNATURE_REGEX.test(trimmedSource)) {
        return 'JPEG image';
    }

    return 'Binary source';
}

/**
 * Checks whether decoded text contains binary noise.
 *
 * @param source - Raw citation source.
 * @returns True when the source appears to be decoded binary bytes.
 *
 * @private utility of Agents Server chat citation labels
 */
function isLikelyBinaryText(source: string): boolean {
    const sample = source.slice(0, BINARY_TEXT_SAMPLE_LENGTH);
    const replacementCharacterCount = sample.match(BINARY_REPLACEMENT_CHARACTER_REGEX)?.length ?? 0;
    const controlCharacterCount = countBinaryControlCharacters(sample);

    return replacementCharacterCount > 0 || controlCharacterCount > 1;
}

/**
 * Counts control characters inside a text sample.
 *
 * @param value - Text sample.
 * @returns Number of binary-looking control characters.
 *
 * @private utility of Agents Server chat citation labels
 */
function countBinaryControlCharacters(value: string): number {
    let controlCharacterCount = 0;

    for (let index = 0; index < value.length; index++) {
        if (isBinaryControlCharacterCode(value.charCodeAt(index))) {
            controlCharacterCount++;
        }
    }

    return controlCharacterCount;
}

/**
 * Checks whether a character code belongs to a binary control range.
 *
 * @param characterCode - Character code.
 * @returns True when the code is a binary-looking control character.
 *
 * @private utility of Agents Server chat citation labels
 */
function isBinaryControlCharacterCode(characterCode: number): boolean {
    return BINARY_CONTROL_CHARACTER_CODE_RANGES.some(
        ([minimumCharacterCode, maximumCharacterCode]) =>
            characterCode >= minimumCharacterCode && characterCode <= maximumCharacterCode,
    );
}

/**
 * Resolves a label from an HTTP content type.
 *
 * @param contentType - Optional response content type.
 * @returns Generic binary label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveContentTypeBinaryLabel(contentType: string | undefined): string | null {
    const normalizedContentType = contentType?.trim();
    if (!normalizedContentType) {
        return null;
    }

    return BINARY_CONTENT_TYPE_LABELS.find(([pattern]) => pattern.test(normalizedContentType))?.[1] || null;
}

/**
 * Resolves a label from common file byte signatures.
 *
 * @param bytes - Source bytes.
 * @returns Generic binary label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function resolveByteSignatureLabel(bytes: Uint8Array): string | null {
    return (
        BINARY_BYTE_SIGNATURE_LABELS.find(({ bytes: signatureBytes, offset = 0 }) =>
            hasByteSignature(bytes, signatureBytes, offset),
        )?.label || null
    );
}

/**
 * Checks whether a byte array starts with a signature at an offset.
 *
 * @param bytes - Source bytes.
 * @param signatureBytes - Signature bytes.
 * @param offset - Offset in source bytes.
 * @returns True when the byte signature matches.
 *
 * @private utility of Agents Server chat citation labels
 */
function hasByteSignature(bytes: Uint8Array, signatureBytes: ReadonlyArray<number>, offset: number): boolean {
    if (bytes.length < offset + signatureBytes.length) {
        return false;
    }

    return signatureBytes.every((signatureByte, index) => bytes[offset + index] === signatureByte);
}

/**
 * Checks whether a parsed JSON value is an object record.
 *
 * @param value - Parsed JSON value.
 * @returns True when the value is a non-array object.
 *
 * @private utility of Agents Server chat citation labels
 */
function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalizes a label candidate into a compact display label.
 *
 * @param value - Raw label candidate.
 * @returns Trimmed label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function normalizeStaticCitationLabel(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();

    return normalized || null;
}

// Note: [🟢] Code for Agents Server static citation labels should never be published into packages that could be imported into browser environment
