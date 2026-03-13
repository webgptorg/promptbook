import { readToolRuntimeContextFromToolArgs } from '../../../../src/commitments/_common/toolRuntimeContext';
import { LimitReachedError } from '../../../../src/errors/LimitReachedError';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../src/errors/ParseError';
import type { TODO_any } from '../../../../src/_packages/types.index';
import { spaceTrim } from '../../../../src/_packages/utils.index';
import type { ToolFunction } from '../../../../src/scripting/javascript/JavascriptExecutionToolsOptions';
import { decodeAttachmentAsText } from '../../../../src/utils/files/decodeAttachmentAsText';
import { normalizeChatAttachments } from '../../../../src/utils/chat/chatAttachments';
import type { ChatAttachment } from '../../../../src/utils/chat/chatAttachments';
import { readResponseBytes } from '../../../../src/utils/files/readResponseBytes';
import { ChatAttachmentToolNames } from './ChatAttachmentToolNames';

/**
 * Default byte window returned by `read_attached_file`.
 */
const DEFAULT_ATTACHED_FILE_READ_WINDOW_BYTES = 32 * 1024;

/**
 * Maximum byte window accepted by `read_attached_file`.
 */
const MAX_ATTACHED_FILE_READ_WINDOW_BYTES = 256 * 1024;

/**
 * Default byte window scanned by `search_attached_file`.
 */
const DEFAULT_ATTACHED_FILE_SEARCH_WINDOW_BYTES = 1024 * 1024;

/**
 * Maximum byte window accepted by `search_attached_file`.
 */
const MAX_ATTACHED_FILE_SEARCH_WINDOW_BYTES = 2 * 1024 * 1024;

/**
 * Maximum characters returned by `read_attached_file`.
 */
const MAX_ATTACHED_FILE_OUTPUT_CHARACTERS = 40_000;

/**
 * Default surrounding context returned for one regex match.
 */
const DEFAULT_ATTACHED_FILE_SEARCH_CONTEXT_CHARACTERS = 160;

/**
 * Maximum surrounding context returned for one regex match.
 */
const MAX_ATTACHED_FILE_SEARCH_CONTEXT_CHARACTERS = 400;

/**
 * Default maximum number of regex matches returned by `search_attached_file`.
 */
const DEFAULT_ATTACHED_FILE_SEARCH_MATCHES = 5;

/**
 * Maximum number of regex matches returned by `search_attached_file`.
 */
const MAX_ATTACHED_FILE_SEARCH_MATCHES = 20;

/**
 * Arguments accepted by both attachment tools.
 */
type ChatAttachmentToolArgsBase = {
    attachment?: unknown;
    forceText?: unknown;
    __promptbookToolRuntimeContext?: unknown;
};

/**
 * Arguments accepted by `read_attached_file`.
 */
type ReadAttachedFileToolArgs = ChatAttachmentToolArgsBase & {
    startByte?: unknown;
    endByte?: unknown;
};

/**
 * Arguments accepted by `search_attached_file`.
 */
type SearchAttachedFileToolArgs = ChatAttachmentToolArgsBase & {
    pattern?: unknown;
    flags?: unknown;
    startByte?: unknown;
    endByte?: unknown;
    maxMatches?: unknown;
    contextCharacters?: unknown;
};

/**
 * Normalized runtime attachments available to the current tool invocation.
 */
type ChatAttachmentRuntimeContext = {
    chat?: {
        attachments?: unknown;
    };
};

/**
 * One normalized byte window resolved from tool arguments.
 */
type ResolvedByteWindow = {
    startByte: number;
    endByte: number;
    requestedByteCount: number;
};

/**
 * One fetched attachment byte window together with response metadata.
 */
type FetchedAttachmentWindow = {
    attachment: ChatAttachment;
    bytes: Uint8Array;
    startByte: number;
    endByte: number;
    totalBytes: number | null;
    contentType: string | null;
    warnings: string[];
};

/**
 * Compact regex match payload returned to the model.
 */
type AttachmentSearchMatch = {
    match: string;
    characterStart: number;
    characterEnd: number;
    snippet: string;
};

/**
 * Creates Agents Server runtime functions for chunked chat attachment access.
 */
export function createChatAttachmentToolFunctions(): Record<string, ToolFunction> {
    return {
        async [ChatAttachmentToolNames.read](args: ReadAttachedFileToolArgs): Promise<string> {
            const attachment = resolveRequestedAttachment(args);
            const byteWindow = resolveByteWindow({
                args,
                defaultWindowBytes: DEFAULT_ATTACHED_FILE_READ_WINDOW_BYTES,
                maxWindowBytes: MAX_ATTACHED_FILE_READ_WINDOW_BYTES,
            });
            const fetchedWindow = await fetchAttachmentWindow({
                attachment,
                byteWindow,
            });
            const decodedWindow = decodeFetchedAttachmentWindow(fetchedWindow, args.forceText === true);
            const warnings = [...fetchedWindow.warnings, ...decodedWindow.warnings];

            if (decodedWindow.wasBinary) {
                return JSON.stringify({
                    attachment,
                    startByte: fetchedWindow.startByte,
                    endByte: fetchedWindow.endByte,
                    requestedByteCount: byteWindow.requestedByteCount,
                    returnedByteCount: fetchedWindow.bytes.byteLength,
                    totalBytes: fetchedWindow.totalBytes,
                    wasBinary: true,
                    encodingUsed: decodedWindow.encodingUsed,
                    confidence: decodedWindow.confidence ?? null,
                    warnings,
                    content: null,
                });
            }

            const truncatedContent = truncateAttachmentToolContent(decodedWindow.text, warnings);

            return JSON.stringify({
                attachment,
                startByte: fetchedWindow.startByte,
                endByte: fetchedWindow.endByte,
                requestedByteCount: byteWindow.requestedByteCount,
                returnedByteCount: fetchedWindow.bytes.byteLength,
                totalBytes: fetchedWindow.totalBytes,
                reachedEndOfFile:
                    fetchedWindow.totalBytes === null ? null : fetchedWindow.endByte >= fetchedWindow.totalBytes - 1,
                wasBinary: false,
                encodingUsed: decodedWindow.encodingUsed,
                confidence: decodedWindow.confidence ?? null,
                warnings,
                content: truncatedContent,
            });
        },

        async [ChatAttachmentToolNames.search](args: SearchAttachedFileToolArgs): Promise<string> {
            const attachment = resolveRequestedAttachment(args);
            const byteWindow = resolveByteWindow({
                args,
                defaultWindowBytes: DEFAULT_ATTACHED_FILE_SEARCH_WINDOW_BYTES,
                maxWindowBytes: MAX_ATTACHED_FILE_SEARCH_WINDOW_BYTES,
            });
            const fetchedWindow = await fetchAttachmentWindow({
                attachment,
                byteWindow,
            });
            const decodedWindow = decodeFetchedAttachmentWindow(fetchedWindow, args.forceText === true);
            const warnings = [...fetchedWindow.warnings, ...decodedWindow.warnings];

            if (decodedWindow.wasBinary) {
                return JSON.stringify({
                    attachment,
                    startByte: fetchedWindow.startByte,
                    endByte: fetchedWindow.endByte,
                    requestedByteCount: byteWindow.requestedByteCount,
                    returnedByteCount: fetchedWindow.bytes.byteLength,
                    totalBytes: fetchedWindow.totalBytes,
                    wasBinary: true,
                    encodingUsed: decodedWindow.encodingUsed,
                    confidence: decodedWindow.confidence ?? null,
                    warnings,
                    matches: [],
                });
            }

            const matches = searchDecodedAttachmentWindow({
                text: decodedWindow.text,
                pattern: normalizeRequiredText(args.pattern, 'pattern'),
                flags: normalizeOptionalText(args.flags),
                maxMatches: normalizeBoundedInteger(
                    args.maxMatches,
                    'maxMatches',
                    1,
                    MAX_ATTACHED_FILE_SEARCH_MATCHES,
                    DEFAULT_ATTACHED_FILE_SEARCH_MATCHES,
                ),
                contextCharacters: normalizeBoundedInteger(
                    args.contextCharacters,
                    'contextCharacters',
                    0,
                    MAX_ATTACHED_FILE_SEARCH_CONTEXT_CHARACTERS,
                    DEFAULT_ATTACHED_FILE_SEARCH_CONTEXT_CHARACTERS,
                ),
            });

            return JSON.stringify({
                attachment,
                startByte: fetchedWindow.startByte,
                endByte: fetchedWindow.endByte,
                requestedByteCount: byteWindow.requestedByteCount,
                returnedByteCount: fetchedWindow.bytes.byteLength,
                totalBytes: fetchedWindow.totalBytes,
                reachedEndOfFile:
                    fetchedWindow.totalBytes === null ? null : fetchedWindow.endByte >= fetchedWindow.totalBytes - 1,
                wasBinary: false,
                encodingUsed: decodedWindow.encodingUsed,
                confidence: decodedWindow.confidence ?? null,
                warnings,
                matches,
                returnedMatchCount: matches.length,
            });
        },
    };
}

/**
 * Resolves the attachment selected by tool arguments from runtime context.
 */
function resolveRequestedAttachment(args: ChatAttachmentToolArgsBase): ChatAttachment {
    const attachmentIdentifier = normalizeRequiredText(args.attachment, 'attachment');
    const runtimeContext = (readToolRuntimeContextFromToolArgs(args as Record<string, TODO_any>) ||
        {}) as ChatAttachmentRuntimeContext;
    const attachments = normalizeChatAttachments(runtimeContext.chat?.attachments);

    if (attachments.length === 0) {
        throw new NotAllowed(
            spaceTrim(`
                Attachment tools are unavailable because this chat turn has no readable attachments.

                Ask the user to attach a file in the current message before using attachment tools.
            `),
        );
    }

    const attachmentByUrl = attachments.find((candidate) => candidate.url === attachmentIdentifier);
    if (attachmentByUrl) {
        return attachmentByUrl;
    }

    const attachmentsByName = attachments.filter((candidate) => candidate.name === attachmentIdentifier);
    if (attachmentsByName.length === 1) {
        return attachmentsByName[0]!;
    }

    if (attachmentsByName.length > 1) {
        throw new NotAllowed(
            spaceTrim(`
                Multiple attached files share the name \`${attachmentIdentifier}\`.

                Use the exact attachment URL instead so the tool knows which file to read.
            `),
        );
    }

    throw new NotFoundError(
        spaceTrim(`
            Attached file \`${attachmentIdentifier}\` was not found in the current chat turn.

            Use the exact attachment name or exact attachment URL shown in the chat context.
        `),
    );
}

/**
 * Normalizes one requested byte window while enforcing per-tool limits.
 */
function resolveByteWindow(options: {
    args: { startByte?: unknown; endByte?: unknown };
    defaultWindowBytes: number;
    maxWindowBytes: number;
}): ResolvedByteWindow {
    const startByte = normalizeOptionalNonNegativeInteger(options.args.startByte, 'startByte') ?? 0;
    const endByte =
        normalizeOptionalNonNegativeInteger(options.args.endByte, 'endByte') ??
        startByte + options.defaultWindowBytes - 1;

    if (endByte < startByte) {
        throw new ParseError(
            spaceTrim(`
                Invalid byte range.

                - \`endByte\` must be greater than or equal to \`startByte\`.
            `),
        );
    }

    const requestedByteCount = endByte - startByte + 1;
    if (requestedByteCount > options.maxWindowBytes) {
        throw new LimitReachedError(
            spaceTrim(`
                Requested byte window is too large.

                - Requested bytes: \`${requestedByteCount}\`
                - Maximum allowed bytes per tool call: \`${options.maxWindowBytes}\`

                Read the file in smaller chunks instead.
            `),
        );
    }

    return {
        startByte,
        endByte,
        requestedByteCount,
    };
}

/**
 * Downloads one bounded byte window from the selected attachment.
 */
async function fetchAttachmentWindow(options: {
    attachment: ChatAttachment;
    byteWindow: ResolvedByteWindow;
}): Promise<FetchedAttachmentWindow> {
    const { attachment, byteWindow } = options;
    const rangeHeaderValue = `bytes=${byteWindow.startByte}-${byteWindow.endByte}`;
    const response = await fetch(attachment.url, {
        headers: {
            Range: rangeHeaderValue,
        },
    });

    if (response.status === 416) {
        throw new NotFoundError(
            spaceTrim(`
                Requested byte range \`${rangeHeaderValue}\` is outside the bounds of attachment \`${attachment.name}\`.
            `),
        );
    }

    if (!response.ok) {
        throw new NotFoundError(
            spaceTrim(`
                Failed to download attachment \`${attachment.name}\`.

                - URL: ${attachment.url}
                - HTTP status: \`${response.status} ${response.statusText}\`
            `),
        );
    }

    const didHonorRange = response.status === 206;
    const captureBytes = didHonorRange ? byteWindow.requestedByteCount : byteWindow.endByte + 1;
    const { bytes: capturedBytes } = await readResponseBytes(response, captureBytes, {
        captureOverflowByte: false,
    });

    if (!didHonorRange && capturedBytes.byteLength <= byteWindow.startByte) {
        throw new NotFoundError(
            spaceTrim(`
                Requested byte range \`${rangeHeaderValue}\` is outside the bounds of attachment \`${attachment.name}\`.
            `),
        );
    }

    const bytes = didHonorRange ? capturedBytes : capturedBytes.subarray(byteWindow.startByte, byteWindow.endByte + 1);
    const warnings: string[] = [];

    if (byteWindow.startByte > 0) {
        warnings.push('Decoded content starts from the middle of the file, so the first characters may be partial.');
    }

    const totalBytes = resolveAttachmentTotalBytes(response, didHonorRange);
    return {
        attachment,
        bytes,
        startByte: byteWindow.startByte,
        endByte: byteWindow.startByte + Math.max(0, bytes.byteLength - 1),
        totalBytes,
        contentType: response.headers.get('content-type'),
        warnings,
    };
}

/**
 * Derives total attachment size from response headers when available.
 */
function resolveAttachmentTotalBytes(response: Response, didHonorRange: boolean): number | null {
    if (didHonorRange) {
        const contentRange = response.headers.get('content-range');
        const match = contentRange?.match(/^bytes\s+\d+-\d+\/(\d+)$/i);
        if (match) {
            const parsed = Number.parseInt(match[1]!, 10);
            return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
        }

        return null;
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
        return null;
    }

    const parsed = Number.parseInt(contentLength, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Decodes one fetched byte window as best-effort text.
 */
function decodeFetchedAttachmentWindow(window: FetchedAttachmentWindow, forceText: boolean) {
    return decodeAttachmentAsText(
        {
            bytes: window.bytes,
            filename: window.attachment.name,
            mimeType: window.contentType || window.attachment.type,
        },
        {
            maxBytes: window.bytes.byteLength,
            forceText,
        },
    );
}

/**
 * Truncates tool output content to one bounded size.
 */
function truncateAttachmentToolContent(content: string, warnings: string[]): string {
    if (content.length <= MAX_ATTACHED_FILE_OUTPUT_CHARACTERS) {
        return content;
    }

    warnings.push(`Returned content was truncated to ${MAX_ATTACHED_FILE_OUTPUT_CHARACTERS} characters.`);
    return `${content.slice(0, MAX_ATTACHED_FILE_OUTPUT_CHARACTERS)}\n\n[...truncated...]`;
}

/**
 * Runs one regex search over decoded attachment text and returns compact snippets.
 */
function searchDecodedAttachmentWindow(options: {
    text: string;
    pattern: string;
    flags?: string;
    maxMatches: number;
    contextCharacters: number;
}): Array<AttachmentSearchMatch> {
    const regex = createSearchRegex(options.pattern, options.flags);
    const matches: Array<AttachmentSearchMatch> = [];

    while (matches.length < options.maxMatches) {
        const match = regex.exec(options.text);
        if (!match) {
            break;
        }

        const matchedText = match[0] ?? '';
        const matchStart = match.index;
        const matchEnd = matchStart + matchedText.length;
        const snippetStart = Math.max(0, matchStart - options.contextCharacters);
        const snippetEnd = Math.min(options.text.length, matchEnd + options.contextCharacters);

        matches.push({
            match: matchedText,
            characterStart: matchStart,
            characterEnd: matchEnd,
            snippet: options.text.slice(snippetStart, snippetEnd),
        });

        if (matchedText === '') {
            regex.lastIndex += 1;
        }
    }

    return matches;
}

/**
 * Creates a safe global regex from tool arguments.
 */
function createSearchRegex(pattern: string, flags?: string): RegExp {
    const normalizedFlags = normalizeOptionalText(flags) || '';
    const globalFlags = normalizedFlags.includes('g') ? normalizedFlags : `${normalizedFlags}g`;

    try {
        return new RegExp(pattern, globalFlags);
    } catch (error) {
        throw new ParseError(
            spaceTrim(`
                Invalid regular expression supplied to \`${ChatAttachmentToolNames.search}\`.

                - Pattern: \`${pattern}\`
                - Flags: \`${globalFlags}\`
                - Error: ${error instanceof Error ? error.message : String(error)}
            `),
        );
    }
}

/**
 * Normalizes one required text tool argument.
 */
function normalizeRequiredText(value: unknown, fieldName: string): string {
    const normalized = normalizeOptionalText(value);

    if (!normalized) {
        throw new ParseError(`Tool argument \`${fieldName}\` must be a non-empty string.`);
    }

    return normalized;
}

/**
 * Normalizes one optional text tool argument.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

/**
 * Normalizes one optional non-negative integer tool argument.
 */
function normalizeOptionalNonNegativeInteger(value: unknown, fieldName: string): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new ParseError(`Tool argument \`${fieldName}\` must be a non-negative integer.`);
    }

    return parsed;
}

/**
 * Normalizes one bounded integer tool argument.
 */
function normalizeBoundedInteger(
    value: unknown,
    fieldName: string,
    min: number,
    max: number,
    fallback: number,
): number {
    const parsed = normalizeOptionalNonNegativeInteger(value, fieldName);

    if (parsed === undefined) {
        return fallback;
    }

    if (parsed < min || parsed > max) {
        throw new LimitReachedError(
            `Tool argument \`${fieldName}\` must be between \`${min}\` and \`${max}\`.`,
        );
    }

    return parsed;
}
