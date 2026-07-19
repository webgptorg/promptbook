import { simplifyKnowledgeLabel } from '../../../utils/knowledge/simplifyKnowledgeLabel';
import type { ParsedCitation } from './parseCitationsFromContent';

/**
 * Broad source category used by chat citation chips.
 *
 * @private utility type of `<Chat/>` citation rendering
 */
export type CitationSourceKind =
    | 'archive'
    | 'audio'
    | 'code'
    | 'document'
    | 'file'
    | 'image'
    | 'json'
    | 'plain-text'
    | 'presentation'
    | 'spreadsheet'
    | 'table'
    | 'video'
    | 'website';

/**
 * Image subtype when the citation source carries enough information to identify it.
 *
 * @private utility type of `<Chat/>` citation rendering
 */
export type CitationImageFormat = 'avif' | 'gif' | 'image' | 'jpeg' | 'png' | 'svg' | 'webp';

/**
 * Render-ready metadata for one citation source.
 *
 * @private utility type of `<Chat/>` citation rendering
 */
export type CitationSourceDisplay = {
    /**
     * Broad source category.
     */
    readonly kind: CitationSourceKind;

    /**
     * Human-readable fallback label used before optional host metadata resolution.
     */
    readonly label: string;

    /**
     * Best known HTTP(S) target for previews and URL snippets.
     */
    readonly targetUrl?: string;

    /**
     * Image URL that can be rendered as a thumbnail.
     */
    readonly thumbnailUrl?: string;

    /**
     * Lower-cased file extension when one is known.
     */
    readonly extension?: string;

    /**
     * Image subtype when known.
     */
    readonly imageFormat?: CitationImageFormat;
};

/**
 * Internal source signature before final labels/preview URLs are resolved.
 *
 * @private utility type of `<Chat/>` citation rendering
 */
export type CitationSourceSignature = {
    /**
     * Broad source category.
     */
    readonly kind: CitationSourceKind;

    /**
     * Image subtype when known.
     */
    readonly imageFormat?: CitationImageFormat;
};

/**
 * Maximum length of plain-text citation labels before truncation.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const TEXT_LABEL_LENGTH = 30;

/**
 * Ellipsis appended to truncated citation labels.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const LABEL_ELLIPSIS = '…';

/**
 * Pattern matching file extensions at the end of a citation source.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const FILE_EXTENSION_REGEX = /\.([a-z0-9]{1,10})$/i;

/**
 * Pattern matching punctuation that should be trimmed from citation tails.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)+\]]+$/;

/**
 * Pattern matching filename separators that should become spaces in source labels.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const FILENAME_SEPARATOR_REGEX = /[-_]+/g;

/**
 * Pattern matching consecutive whitespace in display labels.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const WHITESPACE_REGEX = /\s+/g;

/**
 * Maximum size of JSON-like citation source text parsed for embedded URLs.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const MAX_JSON_SOURCE_PARSE_LENGTH = 20 * 1000;

/**
 * Maximum recursion depth for finding URLs inside JSON-like citation sources.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const MAX_JSON_URL_SCAN_DEPTH = 3;

/**
 * Maximum array items scanned for URLs inside JSON-like citation sources.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const MAX_JSON_ARRAY_ITEMS_TO_SCAN = 3;

/**
 * Number of leading bytes/characters inspected for binary signatures.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const BINARY_SIGNATURE_LENGTH = 8 * 8;

/**
 * Notebook JSON extension assembled to keep spellcheck focused on prose.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const NOTEBOOK_JSON_EXTENSION = ['i', 'p', 'y', 'n', 'b'].join('');

/**
 * Page-layout document extension assembled to keep spellcheck focused on prose.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const PAGE_LAYOUT_DOCUMENT_EXTENSION = ['i', 'n', 'd', 'd'].join('');

/**
 * JPEG file-interchange marker assembled to keep spellcheck focused on prose.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const JPEG_FILE_INTERCHANGE_MARKER = ['j', 'f', 'i', 'f'].join('');

/**
 * JPEG exchangeable-image marker assembled to keep spellcheck focused on prose.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const JPEG_EXCHANGEABLE_IMAGE_MARKER = ['e', 'x', 'i', 'f'].join('');

/**
 * JSON object fields that commonly contain public source URLs.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const JSON_URL_FIELD_NAMES = [
    'html_url',
    'download_url',
    'browser_download_url',
    'web_url',
    'source_url',
    'file_url',
    'url',
] as const;

/**
 * File extension map for citation source categories.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const SOURCE_KIND_BY_EXTENSION: Readonly<Record<string, CitationSourceKind>> = {
    avif: 'image',
    gif: 'image',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    svg: 'image',
    webp: 'image',
    json: 'json',
    jsonl: 'json',
    geojson: 'json',
    [NOTEBOOK_JSON_EXTENSION]: 'json',
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    [PAGE_LAYOUT_DOCUMENT_EXTENSION]: 'document',
    md: 'document',
    markdown: 'document',
    odt: 'document',
    rtf: 'document',
    txt: 'document',
    html: 'website',
    htm: 'website',
    csv: 'table',
    tsv: 'table',
    xls: 'spreadsheet',
    xlsx: 'spreadsheet',
    ods: 'spreadsheet',
    ppt: 'presentation',
    pptx: 'presentation',
    odp: 'presentation',
    js: 'code',
    jsx: 'code',
    ts: 'code',
    tsx: 'code',
    css: 'code',
    scss: 'code',
    xml: 'code',
    yaml: 'code',
    yml: 'code',
    zip: 'archive',
    rar: 'archive',
    tar: 'archive',
    gz: 'archive',
    tgz: 'archive',
    mp4: 'video',
    mov: 'video',
    avi: 'video',
    webm: 'video',
    mp3: 'audio',
    wav: 'audio',
    m4a: 'audio',
    ogg: 'audio',
};

/**
 * Image format map for filename extensions.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const IMAGE_FORMAT_BY_EXTENSION: Readonly<Record<string, CitationImageFormat>> = {
    avif: 'avif',
    gif: 'gif',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    png: 'png',
    svg: 'svg',
    webp: 'webp',
};

/**
 * Human-readable fallback label for each broad source category.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const SOURCE_FALLBACK_LABEL_BY_KIND: Readonly<Record<CitationSourceKind, string>> = {
    archive: 'Archive file',
    audio: 'Audio file',
    code: 'Code file',
    document: 'Document file',
    file: 'File',
    image: 'Image file',
    json: 'JSON file',
    'plain-text': 'Text',
    presentation: 'Presentation file',
    spreadsheet: 'Spreadsheet file',
    table: 'Table file',
    video: 'Video file',
    website: 'Website',
};

/**
 * Human-readable fallback label for known image formats.
 *
 * @private utility constant of `<Chat/>` citation rendering
 */
const IMAGE_FALLBACK_LABEL_BY_FORMAT: Readonly<Record<CitationImageFormat, string>> = {
    avif: 'AVIF image',
    gif: 'GIF image',
    image: 'Image file',
    jpeg: 'JPEG image',
    png: 'PNG image',
    svg: 'SVG image',
    webp: 'WebP image',
};

/**
 * Resolves render-ready source metadata for one citation.
 *
 * @param citation - Citation metadata from a rendered chat message.
 * @returns Display label, source category, and optional preview URLs.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function resolveCitationSourceDisplay(citation: ParsedCitation): CitationSourceDisplay {
    const source = citation.source.trim();
    const explicitTitle = normalizeCitationDisplayLabel(citation.title);
    const directTargetUrl = resolveCitationTargetUrl(citation);
    const rawSourceSignature = resolveRawCitationSourceSignature(source);
    const jsonSourceUrl = rawSourceSignature?.kind === 'json' ? resolveCitationUrlFromJsonSource(source) : null;
    const targetUrl = directTargetUrl || jsonSourceUrl || undefined;
    const extension = resolveCitationFileExtension(citation, targetUrl);
    const extensionSignature = extension ? resolveCitationSourceSignatureFromFileExtension(extension) : null;
    const targetUrlSignature = targetUrl && !extensionSignature ? ({ kind: 'website' } as const) : null;
    const signature =
        rawSourceSignature ||
        extensionSignature ||
        targetUrlSignature ||
        (isPlainTextCitationSource(citation) ? ({ kind: 'plain-text' } as const) : ({ kind: 'file' } as const));
    const imageFormat =
        signature.kind === 'image' ? signature.imageFormat || resolveImageFormatFromExtension(extension) : undefined;
    const label =
        explicitTitle ||
        createCitationSourceFallbackLabel({
            citation,
            extension,
            imageFormat,
            isRawTechnicalSource: Boolean(rawSourceSignature),
            kind: signature.kind,
            source,
            targetUrl,
        });

    return {
        kind: signature.kind,
        label,
        ...(targetUrl ? { targetUrl } : {}),
        ...(signature.kind === 'image' && targetUrl ? { thumbnailUrl: targetUrl } : {}),
        ...(extension ? { extension } : {}),
        ...(imageFormat ? { imageFormat } : {}),
    };
}

/**
 * Returns whether the provided value is a valid HTTP(S) URL.
 *
 * @param value - Candidate string to inspect.
 * @returns True when the value parses as an HTTP or HTTPS URL.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function isCitationSourceUrl(value: string): boolean {
    return Boolean(parseCitationUrl(value));
}

/**
 * Determines whether a citation should be displayed as a text snippet instead of a file/URL.
 *
 * @param citation - Parsed citation metadata.
 * @returns True when the citation looks like inline text instead of a document or URL.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function isPlainTextCitationSource(citation: ParsedCitation): boolean {
    const trimmed = citation.source.trim();
    if (!trimmed) {
        return false;
    }

    if (
        resolveRawCitationSourceSignature(trimmed) ||
        isCitationSourceUrl(trimmed) ||
        resolveCitationFileExtension(citation)
    ) {
        return false;
    }

    if (/\s/.test(trimmed)) {
        return true;
    }

    return trimmed.length > TEXT_LABEL_LENGTH;
}

/**
 * Creates a readable fallback label from a citation source when no title metadata is available.
 *
 * @param source - Raw citation source value.
 * @returns Human-friendly source label.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function createReadableCitationSourceDisplayLabel(source: string): string {
    const trimmed = source.trim();
    if (!trimmed) {
        return source;
    }

    const parsedUrl = parseCitationUrl(trimmed);
    const filenameCandidate = parsedUrl
        ? getUrlLabelCandidate(parsedUrl) || parsedUrl.hostname.replace(/^www\./i, '')
        : simplifyKnowledgeLabel(trimmed);

    return normalizeCitationDisplayLabel(filenameCandidate) || simplifyKnowledgeLabel(trimmed);
}

/**
 * Creates a compact host/path label for URL-backed file citations.
 *
 * @param rawUrl - Raw URL value.
 * @returns URL snippet such as `github.com/.../source.json`, or null for invalid URLs.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function createCitationUrlSnippet(rawUrl: string): string | null {
    const url = parseCitationUrl(rawUrl);
    if (!url) {
        return null;
    }

    const hostname = url.hostname.replace(/^www\./i, '');
    const pathSegments = url.pathname.split('/').filter(Boolean).map(decodeUriComponentSafe);
    if (pathSegments.length === 0) {
        return hostname;
    }

    if (pathSegments.length <= 2) {
        return `${hostname}/${pathSegments.join('/')}`;
    }

    return `${hostname}/.../${pathSegments[pathSegments.length - 1]}`;
}

/**
 * Resolves a source signature from a file extension.
 *
 * @param extension - Lower- or mixed-case file extension.
 * @returns Source signature or null for unknown extensions.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function resolveCitationSourceSignatureFromFileExtension(
    extension: string | null | undefined,
): CitationSourceSignature | null {
    const normalizedExtension = extension?.trim().toLowerCase();
    if (!normalizedExtension) {
        return null;
    }

    const kind = SOURCE_KIND_BY_EXTENSION[normalizedExtension];
    if (!kind) {
        return null;
    }

    return {
        kind,
        ...(kind === 'image' ? { imageFormat: resolveImageFormatFromExtension(normalizedExtension) } : {}),
    };
}

/**
 * Resolves a source signature from an HTTP content type.
 *
 * @param contentType - Raw Content-Type header value.
 * @returns Source signature or null when the content type is not specific enough.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function resolveCitationSourceSignatureFromContentType(contentType: string): CitationSourceSignature | null {
    const mimeType = contentType.split(';')[0]?.trim().toLowerCase() || '';
    if (!mimeType) {
        return null;
    }

    if (mimeType.startsWith('image/')) {
        return {
            kind: 'image',
            imageFormat: resolveImageFormatFromMimeType(mimeType),
        };
    }

    if (mimeType === 'application/json' || mimeType.endsWith('+json')) {
        return { kind: 'json' };
    }

    if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
        return { kind: 'website' };
    }

    if (mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') {
        return { kind: 'table' };
    }

    if (mimeType.startsWith('audio/')) {
        return { kind: 'audio' };
    }

    if (mimeType.startsWith('video/')) {
        return { kind: 'video' };
    }

    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return { kind: 'spreadsheet' };
    }

    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return { kind: 'presentation' };
    }

    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) {
        return { kind: 'archive' };
    }

    if (mimeType === 'application/pdf') {
        return { kind: 'document' };
    }

    return null;
}

/**
 * Resolves a source signature from decoded source text.
 *
 * @param source - Raw citation source text.
 * @returns Source signature for JSON/binary-like source text, otherwise null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function resolveRawCitationSourceSignature(source: string): CitationSourceSignature | null {
    const trimmed = source.trim();
    if (!trimmed) {
        return null;
    }

    const imageSignature = resolveImageSignatureFromText(trimmed);
    if (imageSignature) {
        return imageSignature;
    }

    return isJsonLikeCitationSource(trimmed) ? { kind: 'json' } : null;
}

/**
 * Resolves a source signature from response bytes.
 *
 * @param bytes - Leading response bytes.
 * @returns Source signature for known binary formats, otherwise null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function resolveCitationSourceSignatureFromBytes(bytes: Uint8Array): CitationSourceSignature | null {
    const signature = Array.from(bytes.slice(0, BINARY_SIGNATURE_LENGTH), (byte) => String.fromCharCode(byte)).join('');

    return resolveImageSignatureFromText(signature);
}

/**
 * Creates a generic fallback label for a source signature.
 *
 * @param signature - Source signature.
 * @returns Human-readable fallback label.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function createCitationSourceSignatureFallbackLabel(signature: CitationSourceSignature): string {
    if (signature.kind === 'image' && signature.imageFormat) {
        return IMAGE_FALLBACK_LABEL_BY_FORMAT[signature.imageFormat];
    }

    return SOURCE_FALLBACK_LABEL_BY_KIND[signature.kind];
}

/**
 * Collapses consecutive whitespace into single spaces.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function collapseWhitespace(value: string): string {
    return value.replace(WHITESPACE_REGEX, ' ');
}

/**
 * Normalizes a citation label candidate for display.
 *
 * @param label - Raw candidate label.
 * @returns Cleaned label or `null` when empty.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function normalizeCitationDisplayLabel(label: string | undefined): string | null {
    const normalized = collapseWhitespace((label || '').replace(FILENAME_SEPARATOR_REGEX, ' ')).trim();

    return normalized || null;
}

/**
 * Parses one HTTP(S) citation URL, returning null for non-URL values.
 *
 * @param value - Candidate URL value.
 * @returns Parsed URL or null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function parseCitationUrl(value: string): URL | null {
    try {
        const url = new URL(value.trim().replace(TRAILING_PUNCTUATION_REGEX, ''));
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    } catch {
        return null;
    }
}

/**
 * Resolves the best known target URL directly declared by a citation.
 *
 * @param citation - Citation metadata.
 * @returns HTTP(S) URL or null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function resolveCitationTargetUrl(citation: ParsedCitation): string | null {
    const explicitUrl = citation.url ? parseCitationUrl(citation.url)?.href : null;
    const literalSourceUrl = parseCitationUrl(citation.source)?.href || null;

    return explicitUrl || literalSourceUrl;
}

/**
 * Resolves a file extension from a citation source or its known URL.
 *
 * @param citation - Citation metadata.
 * @param targetUrl - Optional already resolved target URL.
 * @returns Lower-cased extension or null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function resolveCitationFileExtension(citation: ParsedCitation, targetUrl?: string): string | null {
    return (
        extractFileExtensionFromSource(targetUrl || '') ||
        extractFileExtensionFromSource(citation.url || '') ||
        extractFileExtensionFromSource(citation.source)
    );
}

/**
 * Extracts a lower-cased file extension from a URL, path, or filename.
 *
 * @param value - Raw source value.
 * @returns Lower-cased extension or null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function extractFileExtensionFromSource(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parsedUrl = parseCitationUrl(trimmed);
    const sourceWithoutQuery = parsedUrl ? decodeUriComponentSafe(parsedUrl.pathname) : stripQueryAndHash(trimmed);
    const lastSegment = sourceWithoutQuery
        .split(/[\\/]/)
        .filter(Boolean)
        .pop()
        ?.replace(TRAILING_PUNCTUATION_REGEX, '');
    const extensionMatch = lastSegment?.match(FILE_EXTENSION_REGEX);

    return extensionMatch?.[1]?.toLowerCase() || null;
}

/**
 * Creates a source label when no explicit title is available.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function createCitationSourceFallbackLabel(options: {
    readonly citation: ParsedCitation;
    readonly extension: string | null;
    readonly imageFormat?: CitationImageFormat;
    readonly isRawTechnicalSource: boolean;
    readonly kind: CitationSourceKind;
    readonly source: string;
    readonly targetUrl?: string;
}): string {
    if (options.isRawTechnicalSource) {
        return (
            (options.targetUrl ? createCitationUrlSnippet(options.targetUrl) : null) ||
            createCitationSourceSignatureFallbackLabel({
                kind: options.kind,
                ...(options.imageFormat ? { imageFormat: options.imageFormat } : {}),
            })
        );
    }

    const authoredFileLabel = createAuthoredFileCitationLabel(options.source, options.extension, options.kind);
    if (authoredFileLabel && !isCitationSourceUrl(options.source)) {
        return authoredFileLabel;
    }

    if (options.targetUrl && isFileLikeCitationKind(options.kind)) {
        return (
            createCitationUrlSnippet(options.targetUrl) ||
            authoredFileLabel ||
            SOURCE_FALLBACK_LABEL_BY_KIND[options.kind]
        );
    }

    if (options.kind === 'plain-text') {
        return createPlainTextCitationLabel(options.source);
    }

    if (options.targetUrl) {
        return createReadableCitationSourceDisplayLabel(options.targetUrl);
    }

    return createReadableCitationSourceDisplayLabel(options.source) || SOURCE_FALLBACK_LABEL_BY_KIND[options.kind];
}

/**
 * Creates a readable label for an authored filename/path source.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function createAuthoredFileCitationLabel(
    source: string,
    extension: string | null,
    kind: CitationSourceKind,
): string | null {
    if (!extension || kind === 'website' || kind === 'plain-text') {
        return null;
    }

    const filename = extractFilenameCandidate(source);
    if (!filename) {
        return null;
    }

    return normalizeCitationDisplayLabel(filename.replace(FILENAME_SEPARATOR_REGEX, ' '));
}

/**
 * Creates a compact label for inline text citations.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function createPlainTextCitationLabel(source: string): string {
    const collapsed = collapseWhitespace(source.trim());
    if (collapsed.length <= TEXT_LABEL_LENGTH) {
        return collapsed;
    }

    return collapsed.slice(0, TEXT_LABEL_LENGTH) + LABEL_ELLIPSIS;
}

/**
 * Checks whether a source kind should be represented as a file URL snippet when URL-backed.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function isFileLikeCitationKind(kind: CitationSourceKind): boolean {
    return kind !== 'plain-text' && kind !== 'website';
}

/**
 * Extracts a readable candidate from a URL path.
 *
 * @param url - Parsed citation URL.
 * @returns URL path label candidate or null.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function getUrlLabelCandidate(url: URL): string | null {
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const lastPathSegment = pathSegments[pathSegments.length - 1];
    if (!lastPathSegment) {
        return null;
    }

    return simplifyKnowledgeLabel(decodeUriComponentSafe(lastPathSegment));
}

/**
 * Extracts a filename candidate from a URL, path, or filename.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function extractFilenameCandidate(value: string): string | null {
    const parsedUrl = parseCitationUrl(value);
    const source = parsedUrl ? parsedUrl.pathname : value;
    const filename = stripQueryAndHash(source).split(/[\\/]/).filter(Boolean).pop();

    return filename ? decodeUriComponentSafe(filename) : null;
}

/**
 * Removes query-string and hash fragments from URL-like tails.
 *
 * @param value - URL/path tail.
 * @returns Cleaned value without query/hash.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function stripQueryAndHash(value: string): string {
    const queryIndex = value.indexOf('?');
    const hashIndex = value.indexOf('#');
    const cutIndexCandidates = [queryIndex, hashIndex].filter((index) => index >= 0);

    if (cutIndexCandidates.length === 0) {
        return value;
    }

    const firstCutIndex = Math.min(...cutIndexCandidates);
    return value.slice(0, firstCutIndex);
}

/**
 * Checks whether raw source text looks like JSON content.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function isJsonLikeCitationSource(source: string): boolean {
    const trimmed = source.trim();

    return (
        (trimmed.startsWith('{') && (trimmed.includes('":') || trimmed.endsWith('}'))) ||
        (trimmed.startsWith('[') && (trimmed.includes('":') || trimmed.endsWith(']')))
    );
}

/**
 * Finds the first useful URL in JSON-like citation source text.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function resolveCitationUrlFromJsonSource(source: string): string | null {
    if (source.length > MAX_JSON_SOURCE_PARSE_LENGTH) {
        return null;
    }

    try {
        return findCitationUrlInJsonValue(JSON.parse(source), 0);
    } catch {
        return null;
    }
}

/**
 * Recursively finds a URL in parsed JSON citation metadata.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function findCitationUrlInJsonValue(value: unknown, depth: number): string | null {
    if (depth > MAX_JSON_URL_SCAN_DEPTH || value === null) {
        return null;
    }

    if (typeof value === 'string') {
        return parseCitationUrl(value)?.href || null;
    }

    if (Array.isArray(value)) {
        for (const item of value.slice(0, MAX_JSON_ARRAY_ITEMS_TO_SCAN)) {
            const url = findCitationUrlInJsonValue(item, depth + 1);
            if (url) {
                return url;
            }
        }

        return null;
    }

    if (typeof value !== 'object') {
        return null;
    }

    const record = value as Record<string, unknown>;
    for (const fieldName of JSON_URL_FIELD_NAMES) {
        const fieldValue = record[fieldName];
        if (typeof fieldValue === 'string') {
            const url = parseCitationUrl(fieldValue)?.href || null;
            if (url) {
                return url;
            }
        }
    }

    for (const fieldValue of Object.values(record)) {
        const url = findCitationUrlInJsonValue(fieldValue, depth + 1);
        if (url) {
            return url;
        }
    }

    return null;
}

/**
 * Resolves a known image format from an extension.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function resolveImageFormatFromExtension(extension: string | null | undefined): CitationImageFormat | undefined {
    return extension ? IMAGE_FORMAT_BY_EXTENSION[extension.toLowerCase()] : undefined;
}

/**
 * Resolves a known image format from a MIME type.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function resolveImageFormatFromMimeType(mimeType: string): CitationImageFormat {
    const subtype = mimeType.split('/')[1]?.split('+')[0]?.trim().toLowerCase() || '';

    if (subtype === 'jpg') {
        return 'jpeg';
    }

    return (IMAGE_FORMAT_BY_EXTENSION[subtype] || 'image') as CitationImageFormat;
}

/**
 * Resolves image signatures from decoded binary-like text.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function resolveImageSignatureFromText(source: string): CitationSourceSignature | null {
    const signature = source.slice(0, BINARY_SIGNATURE_LENGTH);
    const lowerSignature = signature.toLowerCase();

    if (signature.startsWith('\u0089PNG') || lowerSignature.includes('png')) {
        return { kind: 'image', imageFormat: 'png' };
    }

    if (
        signature.startsWith('\u00ff\u00d8\u00ff') ||
        lowerSignature.includes(JPEG_FILE_INTERCHANGE_MARKER) ||
        lowerSignature.includes(JPEG_EXCHANGEABLE_IMAGE_MARKER)
    ) {
        return { kind: 'image', imageFormat: 'jpeg' };
    }

    if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a')) {
        return { kind: 'image', imageFormat: 'gif' };
    }

    if (signature.startsWith('RIFF') && signature.includes('WEBP')) {
        return { kind: 'image', imageFormat: 'webp' };
    }

    if (lowerSignature.startsWith('<svg')) {
        return { kind: 'image', imageFormat: 'svg' };
    }

    return null;
}

/**
 * Safely decodes URI-encoded strings.
 *
 * @param value - Possibly encoded text.
 * @returns Decoded text, or original value when decoding fails.
 *
 * @private utility of `<Chat/>` citation rendering
 */
function decodeUriComponentSafe(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
