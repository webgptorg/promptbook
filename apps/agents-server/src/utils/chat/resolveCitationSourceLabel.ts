import { JSDOM } from 'jsdom';
import {
    createCitationSourceSignatureFallbackLabel,
    createCitationUrlSnippet,
    resolveCitationSourceDisplay,
    resolveCitationSourceSignatureFromBytes,
    resolveCitationSourceSignatureFromContentType,
    resolveRawCitationSourceSignature,
    type CitationSourceDisplay,
    type CitationSourceKind,
    type CitationSourceSignature,
} from '../../../../../src/book-components/Chat/utils/resolveCitationSourceDisplay';

/**
 * Citation metadata accepted by the Agents Server source-label resolver.
 *
 * @private utility type of Agents Server chat citation labels
 */
export type CitationSourceLabelPayload = {
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
 * Maximum number of bytes fetched when resolving one citation title.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const MAX_SOURCE_LABEL_BYTES = 1_000_000;

/**
 * Timeout for metadata fetches so the chat UI is not blocked by slow sources.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const SOURCE_LABEL_FETCH_TIMEOUT_MS = 4_000;

/**
 * User agent used for lightweight source metadata requests.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const SOURCE_LABEL_USER_AGENT = 'Promptbook Agents Server citation label resolver';

/**
 * Pattern matching markdown headings.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const MARKDOWN_HEADING_REGEX = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m;

/**
 * Pattern matching common PDF/XMP title metadata.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const PDF_XMP_TITLE_REGEX = /<dc:title\b[^>]*>[\s\S]*?<rdf:li\b[^>]*>([\s\S]*?)<\/rdf:li>[\s\S]*?<\/dc:title>/i;

/**
 * Pattern matching simple PDF/XMP title metadata without `rdf:li`.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const PDF_XMP_SIMPLE_TITLE_REGEX = /<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i;

/**
 * Pattern matching PDF literal title metadata.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const PDF_LITERAL_TITLE_REGEX = /\/Title\s*\(((?:\\.|[^\\)]){1,500})\)/s;

/**
 * Pattern matching PDF hexadecimal title metadata.
 *
 * @private utility constant of Agents Server chat citation labels
 */
const PDF_HEX_TITLE_REGEX = /\/Title\s*<([0-9a-fA-F\s]{2,1000})>/;

/**
 * Returns the HTTP(S) URL that can be fetched for richer citation metadata.
 *
 * @param citation - Citation payload received from the chat UI.
 * @returns URL string or null when the citation has no fetchable target.
 *
 * @private utility of Agents Server chat citation labels
 */
export function resolveCitationLabelTargetUrl(citation: CitationSourceLabelPayload): string | null {
    return normalizeHttpUrl(citation.url) || normalizeHttpUrl(citation.source);
}

/**
 * Resolves a human-readable source label from page or document metadata.
 *
 * @param citation - Citation metadata from the chat UI.
 * @returns Resolved label or null when no useful title metadata is available.
 *
 * @private utility of Agents Server chat citation labels
 */
export async function resolveCitationSourceLabel(citation: CitationSourceLabelPayload): Promise<string | null> {
    const explicitTitle = normalizeResolvedCitationLabel(citation.title);
    if (explicitTitle) {
        return explicitTitle;
    }

    const targetUrl = resolveCitationLabelTargetUrl(citation);
    if (!targetUrl) {
        return null;
    }

    const targetDisplay = resolveCitationSourceDisplay({
        id: 'citation-label-target',
        source: targetUrl,
    });
    if (isUrlSnippetSufficientForTarget(targetDisplay)) {
        return targetDisplay.label;
    }

    const response = await fetch(targetUrl, {
        headers: {
            'User-Agent': SOURCE_LABEL_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/pdf,text/markdown,text/plain;q=0.9,*/*;q=0.1',
        },
        signal: AbortSignal.timeout(SOURCE_LABEL_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
        return null;
    }

    const bytes = await readResponseSnippet(response, MAX_SOURCE_LABEL_BYTES);
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    const fetchedSignature =
        resolveCitationSourceSignatureFromContentType(contentType) ||
        resolveCitationSourceSignatureFromBytes(bytes) ||
        resolveRawCitationSourceSignature(new TextDecoder('utf-8', { fatal: false }).decode(bytes));

    if (fetchedSignature && isUrlSnippetSufficientForFetchedSource(fetchedSignature, targetDisplay.extension)) {
        return createCitationUrlSnippet(targetUrl) || createCitationSourceSignatureFallbackLabel(fetchedSignature);
    }

    const isPdf = contentType.includes('application/pdf') || targetUrl.toLowerCase().split('?')[0]?.endsWith('.pdf');

    if (isPdf || startsWithPdfSignature(bytes)) {
        return extractCitationLabelFromPdfBytes(bytes);
    }

    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (contentType.includes('markdown') || contentType.includes('text/plain')) {
        return extractCitationLabelFromPlainText(text);
    }

    return extractCitationLabelFromHtml(text) || extractCitationLabelFromPlainText(text);
}

/**
 * Returns whether the target already has enough file-like URL information for a label.
 *
 * @param targetDisplay - Display metadata resolved from the target URL itself.
 * @returns True when fetching metadata would likely produce unreadable binary/structured payload text.
 *
 * @private utility of Agents Server chat citation labels
 */
function isUrlSnippetSufficientForTarget(targetDisplay: CitationSourceDisplay): boolean {
    return isUrlSnippetSufficientForKind(targetDisplay.kind, targetDisplay.extension);
}

/**
 * Returns whether fetched content should be labelled by URL snippet rather than decoded body text.
 *
 * @param signature - Source signature resolved from response headers or bytes.
 * @param extension - Target URL extension when known.
 * @returns True when body text should not become the visible chip label.
 *
 * @private utility of Agents Server chat citation labels
 */
function isUrlSnippetSufficientForFetchedSource(
    signature: CitationSourceSignature,
    extension: string | undefined,
): boolean {
    return isUrlSnippetSufficientForKind(signature.kind, extension);
}

/**
 * Returns whether a source kind is not useful to inspect for title text.
 *
 * @param kind - Source kind.
 * @param extension - Target URL extension when known.
 * @returns True when a compact URL snippet is the best label.
 *
 * @private utility of Agents Server chat citation labels
 */
function isUrlSnippetSufficientForKind(kind: CitationSourceKind, extension: string | undefined): boolean {
    if (kind === 'json' || kind === 'image') {
        return true;
    }

    if (kind !== 'document') {
        return kind !== 'plain-text' && kind !== 'website';
    }

    return Boolean(extension && !['md', 'markdown', 'pdf', 'txt'].includes(extension));
}

/**
 * Extracts a title from an HTML document.
 *
 * @param html - HTML source snippet.
 * @returns Metadata title, heading, or null.
 *
 * @private utility of Agents Server chat citation labels
 */
export function extractCitationLabelFromHtml(html: string): string | null {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const candidates = [
        getMetaContent(document, 'property', 'og:title'),
        getMetaContent(document, 'name', 'twitter:title'),
        document.querySelector('title')?.textContent,
        document.querySelector('h1')?.textContent,
    ];

    return candidates.map(normalizeResolvedCitationLabel).find((label): label is string => Boolean(label)) || null;
}

/**
 * Extracts a title from plain text or markdown-like document snippets.
 *
 * @param text - Text source snippet.
 * @returns Heading or first useful line.
 *
 * @private utility of Agents Server chat citation labels
 */
export function extractCitationLabelFromPlainText(text: string): string | null {
    const headingMatch = text.match(MARKDOWN_HEADING_REGEX);
    const heading = normalizeResolvedCitationLabel(headingMatch?.[1]);
    if (heading) {
        return heading;
    }

    const firstLine = text
        .split(/\r?\n/)
        .map(normalizeResolvedCitationLabel)
        .find((line): line is string => Boolean(line));

    return firstLine || null;
}

/**
 * Extracts a title from PDF metadata bytes.
 *
 * @param bytes - PDF byte snippet.
 * @returns PDF metadata title or null.
 *
 * @private utility of Agents Server chat citation labels
 */
export function extractCitationLabelFromPdfBytes(bytes: Uint8Array): string | null {
    const latin1Text = Buffer.from(bytes).toString('latin1');
    const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const xmpTitle = extractPdfXmpTitle(utf8Text);
    if (xmpTitle) {
        return xmpTitle;
    }

    const literalTitleMatch = latin1Text.match(PDF_LITERAL_TITLE_REGEX);
    const literalTitle = normalizeResolvedCitationLabel(
        literalTitleMatch?.[1] ? decodePdfLiteralString(literalTitleMatch[1]) : undefined,
    );
    if (literalTitle) {
        return literalTitle;
    }

    const hexTitleMatch = latin1Text.match(PDF_HEX_TITLE_REGEX);
    return normalizeResolvedCitationLabel(hexTitleMatch?.[1] ? decodePdfHexString(hexTitleMatch[1]) : undefined);
}

/**
 * Reads at most `maxBytes` bytes from one fetch response.
 *
 * @param response - Fetch response.
 * @param maxBytes - Maximum number of bytes to keep.
 * @returns Collected response bytes.
 *
 * @private utility of Agents Server chat citation labels
 */
async function readResponseSnippet(response: Response, maxBytes: number): Promise<Uint8Array> {
    if (!response.body) {
        return new Uint8Array(await response.arrayBuffer()).slice(0, maxBytes);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let collectedBytes = 0;

    try {
        while (collectedBytes < maxBytes) {
            const { done, value } = await reader.read();
            if (done || !value) {
                break;
            }

            const remainingBytes = maxBytes - collectedBytes;
            const chunk = value.length > remainingBytes ? value.slice(0, remainingBytes) : value;
            chunks.push(chunk);
            collectedBytes += chunk.length;
        }

        if (collectedBytes >= maxBytes) {
            await reader.cancel();
        }
    } finally {
        reader.releaseLock();
    }

    const bytes = new Uint8Array(collectedBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }

    return bytes;
}

/**
 * Extracts the content attribute from a matching metadata tag.
 *
 * @param document - Parsed DOM document.
 * @param attribute - Metadata selector attribute.
 * @param value - Metadata selector value.
 * @returns Metadata content or undefined.
 *
 * @private utility of Agents Server chat citation labels
 */
function getMetaContent(document: Document, attribute: 'name' | 'property', value: string): string | undefined {
    return document.querySelector(`meta[${attribute}="${value}"]`)?.getAttribute('content') || undefined;
}

/**
 * Normalizes a title candidate into a compact display label.
 *
 * @param label - Raw label candidate.
 * @returns Trimmed label or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function normalizeResolvedCitationLabel(label: string | null | undefined): string | null {
    const normalized = (label || '').replace(/\s+/g, ' ').trim();

    return normalized || null;
}

/**
 * Returns a normalized HTTP(S) URL candidate.
 *
 * @param value - URL candidate.
 * @returns URL href or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function normalizeHttpUrl(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    try {
        const url = new URL(value.trim());
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

/**
 * Checks whether bytes start with a PDF file signature.
 *
 * @param bytes - Response bytes.
 * @returns True when the snippet looks like a PDF.
 *
 * @private utility of Agents Server chat citation labels
 */
function startsWithPdfSignature(bytes: Uint8Array): boolean {
    return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/**
 * Extracts an XMP title from a PDF text snippet.
 *
 * @param text - UTF-8 decoded PDF snippet.
 * @returns XMP title or null.
 *
 * @private utility of Agents Server chat citation labels
 */
function extractPdfXmpTitle(text: string): string | null {
    const title =
        text.match(PDF_XMP_TITLE_REGEX)?.[1] || text.match(PDF_XMP_SIMPLE_TITLE_REGEX)?.[1]?.replace(/<[^>]+>/g, ' ');

    return normalizeResolvedCitationLabel(title ? decodeHtmlText(title) : undefined);
}

/**
 * Decodes text entities using the DOM parser already used for HTML titles.
 *
 * @param value - Raw HTML text.
 * @returns Decoded text.
 *
 * @private utility of Agents Server chat citation labels
 */
function decodeHtmlText(value: string): string {
    return new JSDOM(`<span>${value}</span>`).window.document.querySelector('span')?.textContent || value;
}

/**
 * Decodes a PDF literal string.
 *
 * @param value - Escaped PDF literal value.
 * @returns Decoded text.
 *
 * @private utility of Agents Server chat citation labels
 */
function decodePdfLiteralString(value: string): string {
    const decoded = value
        .replace(/\\\r?\n/g, '')
        .replace(/\\([nrtbf()\\])/g, (_match, escaped: string) => {
            const replacements: Record<string, string> = {
                n: '\n',
                r: '\r',
                t: '\t',
                b: '\b',
                f: '\f',
                '(': '(',
                ')': ')',
                '\\': '\\',
            };

            return replacements[escaped] || escaped;
        })
        .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)));

    return decodePdfBinaryString(decoded);
}

/**
 * Decodes a PDF hexadecimal string.
 *
 * @param value - Hex encoded PDF string.
 * @returns Decoded text.
 *
 * @private utility of Agents Server chat citation labels
 */
function decodePdfHexString(value: string): string {
    const normalizedHex = value.replace(/\s+/g, '');
    const evenHex = normalizedHex.length % 2 === 0 ? normalizedHex : `${normalizedHex}0`;
    const bytes = new Uint8Array(evenHex.length / 2);

    for (let index = 0; index < evenHex.length; index += 2) {
        bytes[index / 2] = parseInt(evenHex.slice(index, index + 2), 16);
    }

    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return decodeUtf16BeBytes(bytes.slice(2));
    }

    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Decodes a binary string that may use a UTF-16BE byte-order mark.
 *
 * @param value - Binary string with one byte per character.
 * @returns Decoded text.
 *
 * @private utility of Agents Server chat citation labels
 */
function decodePdfBinaryString(value: string): string {
    if (value.charCodeAt(0) === 0xfe && value.charCodeAt(1) === 0xff) {
        const bytes = Uint8Array.from(value.slice(2), (character) => character.charCodeAt(0));
        return decodeUtf16BeBytes(bytes);
    }

    return value;
}

/**
 * Decodes UTF-16BE bytes into a JavaScript string.
 *
 * @param bytes - Big-endian UTF-16 bytes.
 * @returns Decoded text.
 *
 * @private utility of Agents Server chat citation labels
 */
function decodeUtf16BeBytes(bytes: Uint8Array): string {
    let text = '';
    for (let index = 0; index + 1 < bytes.length; index += 2) {
        text += String.fromCharCode((bytes[index]! << 8) | bytes[index + 1]!);
    }

    return text;
}

// Note: [🟢] Code for Agents Server chat citation label resolver should never be published into packages that could be imported into browser environment
