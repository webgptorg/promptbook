/* eslint-disable no-magic-numbers */

/**
 * Input payload accepted by `decodeAttachmentAsText`.
 *
 * @private internal utility for shared text decoding
 */
export type DecodeAttachmentAsTextInput = {
    /**
     * Raw file bytes to inspect and decode.
     */
    readonly bytes: ArrayBuffer | ArrayBufferView;

    /**
     * Original filename used for diagnostics.
     */
    readonly filename: string;

    /**
     * Optional MIME type from transport or storage metadata.
     */
    readonly mimeType?: string | null;
};

/**
 * Optional settings for `decodeAttachmentAsText`.
 *
 * @private internal utility for shared text decoding
 */
export type DecodeAttachmentAsTextOptions = {
    /**
     * Max bytes to decode before truncating the payload.
     *
     * @default 524288
     */
    readonly maxBytes?: number;

    /**
     * Forces text decoding even when the bytes look binary.
     *
     * @default false
     */
    readonly forceText?: boolean;
};

/**
 * Best-effort text-decoding result for one attachment or file.
 *
 * @private internal utility for shared text decoding
 */
export type DecodeAttachmentAsTextResult = {
    /**
     * Decoded text. Empty string when decoding is skipped for binary content.
     */
    readonly text: string;

    /**
     * Encoding label used for decoding, or `binary` when decoding was skipped.
     */
    readonly encodingUsed: string;

    /**
     * Confidence score from `0` to `1`.
     */
    readonly confidence?: number;

    /**
     * Human-readable warnings describing truncation or guessed encodings.
     */
    readonly warnings: Array<string>;

    /**
     * Whether the payload was classified as binary and therefore not decoded.
     */
    readonly wasBinary: boolean;

    /**
     * Whether the byte payload had to be truncated before decoding.
     */
    readonly isTruncated: boolean;
};

/**
 * Default byte limit for one best-effort text decode.
 *
 * @private constant of decodeAttachmentAsText
 */
export const DEFAULT_ATTACHMENT_TEXT_DECODE_BYTES = 512 * 1024;

/**
 * Marker appended when only a prefix of the payload is decoded.
 *
 * @private constant of decodeAttachmentAsText
 */
const TRUNCATED_MARKER = '…[TRUNCATED]…';

/**
 * MIME types that are trustworthy indicators of textual content.
 *
 * @private constant of decodeAttachmentAsText
 */
const TRUSTED_TEXT_MIME_TYPES = new Set<string>([
    'application/json',
    'application/ld+json',
    'application/javascript',
    'application/x-javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/x-www-form-urlencoded',
    'application/yaml',
    'application/x-yaml',
    'application/toml',
    'application/sql',
    'application/rtf',
    'application/x-subrip',
]);

/**
 * MIME types that are trustworthy indicators of binary content.
 *
 * @private constant of decodeAttachmentAsText
 */
const TRUSTED_BINARY_MIME_TYPES = new Set<string>([
    'application/pdf',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-7z-compressed',
    'application/vnd.rar',
    'application/x-rar-compressed',
]);

/**
 * MIME prefixes that strongly indicate binary content.
 *
 * @private constant of decodeAttachmentAsText
 */
const TRUSTED_BINARY_MIME_PREFIXES = ['image/', 'audio/', 'video/', 'font/', 'model/'];

/**
 * Suspicious characters that often appear when `windows-1250` text is decoded as `windows-1252`.
 *
 * @private constant of decodeAttachmentAsText
 */
const SUSPICIOUS_SINGLE_BYTE_ARTIFACTS = new Set<string>([
    'ˇ',
    '˘',
    '˙',
    '˛',
    '˝',
    '¸',
    '¤',
    '¦',
    '¨',
    '¯',
    '²',
    '³',
    '¹',
]);

/**
 * Supported fallback encodings tried when UTF-8 is not convincing.
 *
 * @private constant of decodeAttachmentAsText
 */
const FALLBACK_ENCODINGS = ['windows-1250', 'windows-1252', 'iso-8859-1'] as const;

/**
 * Converts unknown byte containers into `Uint8Array`.
 *
 * @private function of decodeAttachmentAsText
 */
function toUint8Array(bytes: ArrayBuffer | ArrayBufferView): Uint8Array {
    if (bytes instanceof Uint8Array) {
        return bytes;
    }

    if (ArrayBuffer.isView(bytes)) {
        return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    return new Uint8Array(bytes);
}

/**
 * Removes MIME parameters and normalizes casing.
 *
 * @private function of decodeAttachmentAsText
 */
function normalizeMimeType(mimeType: string | null | undefined): string | null {
    if (!mimeType) {
        return null;
    }

    const normalized = mimeType.split(';')[0]!.trim().toLowerCase();
    return normalized || null;
}

/**
 * Extracts optional `charset=...` information from a MIME type value.
 *
 * @private function of decodeAttachmentAsText
 */
function extractCharset(mimeType: string | null | undefined): string | null {
    if (!mimeType) {
        return null;
    }

    const match = mimeType.match(/charset\s*=\s*("?)([^";\s]+)\1/i);
    if (!match) {
        return null;
    }

    return match[2]!.trim().toLowerCase();
}

/**
 * Returns true when the MIME type is a strong textual hint.
 *
 * @private function of decodeAttachmentAsText
 */
function isTrustedTextMimeType(mimeType: string | null): boolean {
    if (!mimeType) {
        return false;
    }

    return (
        mimeType.startsWith('text/') ||
        mimeType.endsWith('+json') ||
        mimeType.endsWith('+xml') ||
        TRUSTED_TEXT_MIME_TYPES.has(mimeType)
    );
}

/**
 * Returns true when the MIME type is a strong binary hint.
 *
 * @private function of decodeAttachmentAsText
 */
function isTrustedBinaryMimeType(mimeType: string | null): boolean {
    if (!mimeType) {
        return false;
    }

    if (TRUSTED_BINARY_MIME_TYPES.has(mimeType)) {
        return true;
    }

    return TRUSTED_BINARY_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

/**
 * Detects common BOM-prefixed encodings.
 *
 * @private function of decodeAttachmentAsText
 */
function detectBom(bytes: Uint8Array): { encoding: 'utf-8' | 'utf-16le' | 'utf-16be'; offset: number } | null {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return { encoding: 'utf-8', offset: 3 };
    }

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return { encoding: 'utf-16le', offset: 2 };
    }

    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return { encoding: 'utf-16be', offset: 2 };
    }

    return null;
}

/**
 * Detects a few high-signal binary signatures.
 *
 * @private function of decodeAttachmentAsText
 */
function hasKnownBinarySignature(bytes: Uint8Array): boolean {
    if (bytes.length >= 8) {
        const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        if (pngSignature.every((value, index) => bytes[index] === value)) {
            return true;
        }
    }

    if (bytes.length >= 4) {
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
            return true;
        }

        if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
            return true;
        }

        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
            return true;
        }
    }

    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return true;
    }

    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        return true;
    }

    return false;
}

/**
 * Returns true for printable ASCII bytes and allowed whitespace.
 *
 * @private function of decodeAttachmentAsText
 */
function isPrintableAsciiByte(value: number): boolean {
    return value === 0x09 || value === 0x0a || value === 0x0d || value === 0x0c || (value >= 0x20 && value <= 0x7e);
}

/**
 * Inspects a byte sample to decide whether it looks like text or binary data.
 *
 * @private function of decodeAttachmentAsText
 */
function inspectBytes(bytes: Uint8Array): {
    readonly looksBinary: boolean;
    readonly looksUtf16WithoutBom: boolean;
    readonly utf16Encoding: 'utf-16le' | 'utf-16be' | null;
} {
    const sample = bytes.subarray(0, Math.min(bytes.length, 4096));

    if (sample.length === 0) {
        return {
            looksBinary: false,
            looksUtf16WithoutBom: false,
            utf16Encoding: null,
        };
    }

    if (detectBom(sample)) {
        return {
            looksBinary: false,
            looksUtf16WithoutBom: false,
            utf16Encoding: null,
        };
    }

    if (hasKnownBinarySignature(sample)) {
        return {
            looksBinary: true,
            looksUtf16WithoutBom: false,
            utf16Encoding: null,
        };
    }

    let suspiciousByteCount = 0;
    let nullByteCount = 0;
    let oddNullByteCount = 0;
    let evenNullByteCount = 0;
    let oddPrintableCount = 0;
    let evenPrintableCount = 0;

    for (let index = 0; index < sample.length; index++) {
        const value = sample[index]!;

        if (value === 0x00) {
            nullByteCount += 1;
            if (index % 2 === 0) {
                evenNullByteCount += 1;
            } else {
                oddNullByteCount += 1;
            }
            continue;
        }

        if (index % 2 === 0 && isPrintableAsciiByte(value)) {
            evenPrintableCount += 1;
        }

        if (index % 2 === 1 && isPrintableAsciiByte(value)) {
            oddPrintableCount += 1;
        }

        if (!isPrintableAsciiByte(value) && value < 0x20) {
            suspiciousByteCount += 1;
        }

        if (value === 0x7f) {
            suspiciousByteCount += 1;
        }
    }

    const halfLength = Math.max(1, Math.floor(sample.length / 2));
    const likelyUtf16Le = oddNullByteCount / halfLength > 0.3 && evenPrintableCount / halfLength > 0.6;
    const likelyUtf16Be = evenNullByteCount / halfLength > 0.3 && oddPrintableCount / halfLength > 0.6;
    const looksUtf16WithoutBom = likelyUtf16Le || likelyUtf16Be;
    const suspiciousRatio = suspiciousByteCount / sample.length;
    const nullRatio = nullByteCount / sample.length;

    return {
        looksBinary: !looksUtf16WithoutBom && (nullRatio > 0.01 || suspiciousRatio > 0.2),
        looksUtf16WithoutBom,
        utf16Encoding: likelyUtf16Le ? 'utf-16le' : likelyUtf16Be ? 'utf-16be' : null,
    };
}

/**
 * Returns true when the runtime supports the given decoder label.
 *
 * @private function of decodeAttachmentAsText
 */
function isSupportedEncoding(encoding: string): boolean {
    try {
        new TextDecoder(encoding);
        return true;
    } catch {
        return false;
    }
}

/**
 * Appends the truncation marker without normalizing existing line endings.
 *
 * @private function of decodeAttachmentAsText
 */
function appendTruncatedMarker(text: string): string {
    if (text === '') {
        return TRUNCATED_MARKER;
    }

    if (text.endsWith('\r\n')) {
        return `${text}${TRUNCATED_MARKER}`;
    }

    if (text.endsWith('\n') || text.endsWith('\r')) {
        return `${text}${TRUNCATED_MARKER}`;
    }

    return `${text}\n${TRUNCATED_MARKER}`;
}

/**
 * Counts occurrences of the replacement character used by lossy decoding.
 *
 * @private function of decodeAttachmentAsText
 */
function countReplacementCharacters(text: string): number {
    return (text.match(/\uFFFD/g) || []).length;
}

/**
 * Scores one decoded string so more human-looking text wins.
 *
 * @private function of decodeAttachmentAsText
 */
function scoreDecodedText(text: string, encoding: string): {
    readonly score: number;
    readonly replacementCount: number;
    readonly controlCount: number;
    readonly suspiciousArtifactCount: number;
} {
    const sample = text.slice(0, 4000);
    const length = Math.max(1, sample.length);
    const replacementCount = countReplacementCharacters(sample);
    let controlCount = 0;
    let suspiciousArtifactCount = 0;

    for (const character of sample) {
        if (character === '\n' || character === '\r' || character === '\t' || character === '\f') {
            continue;
        }

        const codePoint = character.codePointAt(0) || 0;
        if ((codePoint >= 0 && codePoint < 0x20) || codePoint === 0x7f) {
            controlCount += 1;
        }

        if (SUSPICIOUS_SINGLE_BYTE_ARTIFACTS.has(character)) {
            suspiciousArtifactCount += 1;
        }
    }

    const replacementRatio = replacementCount / length;
    const controlRatio = controlCount / length;
    const suspiciousArtifactRatio = suspiciousArtifactCount / length;
    const utf8Bias = encoding === 'utf-8' ? -0.02 : 0;

    return {
        score: replacementRatio * 8 + controlRatio * 5 + suspiciousArtifactRatio * 3 + utf8Bias,
        replacementCount,
        controlCount,
        suspiciousArtifactCount,
    };
}

/**
 * Decodes the bytes with one candidate encoding.
 *
 * @private function of decodeAttachmentAsText
 */
function decodeWithEncoding(bytes: Uint8Array, encoding: string): {
    readonly text: string;
    readonly encoding: string;
    readonly score: number;
    readonly replacementCount: number;
    readonly controlCount: number;
} | null {
    if (!isSupportedEncoding(encoding)) {
        return null;
    }

    const text = new TextDecoder(encoding).decode(bytes);
    const scored = scoreDecodedText(text, encoding);

    return {
        text,
        encoding,
        score: scored.score,
        replacementCount: scored.replacementCount,
        controlCount: scored.controlCount,
    };
}

/**
 * Returns unique candidate encodings in the order they should be attempted.
 *
 * @private function of decodeAttachmentAsText
 */
function buildCandidateEncodings(options: {
    readonly mimeType: string | null;
    readonly charset: string | null;
    readonly bom: ReturnType<typeof detectBom>;
    readonly inspection: ReturnType<typeof inspectBytes>;
}): Array<{ encoding: string; source: 'bom' | 'charset' | 'heuristic' }> {
    const candidates: Array<{ encoding: string; source: 'bom' | 'charset' | 'heuristic' }> = [];

    if (options.bom) {
        candidates.push({ encoding: options.bom.encoding, source: 'bom' });
    }

    if (options.charset && isSupportedEncoding(options.charset)) {
        candidates.push({ encoding: options.charset, source: 'charset' });
    }

    if (!options.bom) {
        candidates.push({ encoding: 'utf-8', source: 'heuristic' });
    }

    if (!options.bom && options.inspection.looksUtf16WithoutBom && options.inspection.utf16Encoding) {
        candidates.push({ encoding: options.inspection.utf16Encoding, source: 'heuristic' });
    }

    for (const fallbackEncoding of FALLBACK_ENCODINGS) {
        candidates.push({ encoding: fallbackEncoding, source: 'heuristic' });
    }

    const seen = new Set<string>();
    return candidates.filter(({ encoding }) => {
        if (seen.has(encoding)) {
            return false;
        }
        seen.add(encoding);
        return true;
    });
}

/**
 * Best-effort decoder for uploaded or remote file bytes whose extension or encoding may be unknown.
 *
 * @private internal utility for shared text decoding
 */
export function decodeAttachmentAsText(
    input: DecodeAttachmentAsTextInput,
    options: DecodeAttachmentAsTextOptions = {},
): DecodeAttachmentAsTextResult {
    const maxBytes = Math.max(1, Math.floor(options.maxBytes ?? DEFAULT_ATTACHMENT_TEXT_DECODE_BYTES));
    const forceText = options.forceText === true;
    const warnings: Array<string> = [];
    const rawBytes = toUint8Array(input.bytes);
    const mimeType = normalizeMimeType(input.mimeType);
    const charset = extractCharset(input.mimeType);
    const isTruncated = rawBytes.byteLength > maxBytes;
    const truncatedBytes = isTruncated ? rawBytes.subarray(0, maxBytes) : rawBytes;
    const bom = detectBom(truncatedBytes);
    const inspection = inspectBytes(truncatedBytes);
    const trustedTextMime = isTrustedTextMimeType(mimeType);
    const trustedBinaryMime = isTrustedBinaryMimeType(mimeType);

    if (isTruncated) {
        warnings.push(
            `Decoded only the first ${maxBytes} bytes of \`${input.filename}\` because the attachment exceeded the text preview limit.`,
        );
    }

    const shouldTreatAsBinary = (trustedBinaryMime || inspection.looksBinary) && !trustedTextMime;
    if (shouldTreatAsBinary && !forceText) {
        warnings.push('File content looks binary, so text decoding was skipped.');

        return {
            text: '',
            encodingUsed: 'binary',
            confidence: 1,
            warnings,
            wasBinary: true,
            isTruncated,
        };
    }

    if (shouldTreatAsBinary && forceText) {
        warnings.push('File content looks binary, but text decoding was forced with `forceText`.');
    }

    if (charset && !isSupportedEncoding(charset)) {
        warnings.push(`Ignored unsupported declared charset \`${charset}\` and used best-effort detection instead.`);
    }

    const bytesToDecode = bom ? truncatedBytes.subarray(bom.offset) : truncatedBytes;
    const candidates = buildCandidateEncodings({
        mimeType,
        charset: charset && isSupportedEncoding(charset) ? charset : null,
        bom,
        inspection,
    });

    const decodedCandidates = candidates
        .map(({ encoding, source }) => {
            const decoded = decodeWithEncoding(bytesToDecode, encoding);
            return decoded ? { ...decoded, source } : null;
        })
        .filter(
            (
                candidate,
            ): candidate is {
                readonly text: string;
                readonly encoding: string;
                readonly score: number;
                readonly replacementCount: number;
                readonly controlCount: number;
                readonly source: 'bom' | 'charset' | 'heuristic';
            } => candidate !== null,
        )
        .sort((left, right) => left.score - right.score);

    const bestCandidate = decodedCandidates[0];
    if (!bestCandidate) {
        warnings.push('No supported text decoder was available.');

        return {
            text: '',
            encodingUsed: 'binary',
            confidence: 0,
            warnings,
            wasBinary: true,
            isTruncated,
        };
    }

    const secondBestCandidate = decodedCandidates[1];
    const baseConfidence =
        bestCandidate.source === 'bom'
            ? 1
            : bestCandidate.source === 'charset'
              ? 0.95
              : bestCandidate.encoding === 'utf-8' &&
                  bestCandidate.replacementCount === 0 &&
                  bestCandidate.controlCount === 0
                ? 0.98
                : bestCandidate.encoding === 'utf-8'
                  ? 0.82
                  : 0.62;
    const scoreMargin = secondBestCandidate ? Math.max(0, secondBestCandidate.score - bestCandidate.score) : 0.2;
    const confidence = Math.max(
        0.2,
        Math.min(
            shouldTreatAsBinary && forceText ? 0.45 : 1,
            baseConfidence + Math.min(0.18, scoreMargin / 2),
        ),
    );

    if (bestCandidate.source === 'heuristic' && bestCandidate.encoding !== 'utf-8') {
        warnings.push(`Encoding was guessed as \`${bestCandidate.encoding}\`.`);
    }

    if (
        bestCandidate.source === 'heuristic' &&
        bestCandidate.encoding === 'utf-8' &&
        bestCandidate.replacementCount > 0
    ) {
        warnings.push('UTF-8 decoding produced replacement characters, so the extracted text may contain errors.');
    }

    if (confidence < 0.6) {
        warnings.push('Decoding confidence is low, so the extracted text may contain errors.');
    }

    return {
        text: isTruncated ? appendTruncatedMarker(bestCandidate.text) : bestCandidate.text,
        encodingUsed: bestCandidate.encoding,
        confidence,
        warnings,
        wasBinary: false,
        isTruncated,
    };
}
