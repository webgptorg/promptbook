import { buildChatHtml } from '../../../../../../../../src/book-components/Chat/save/html/htmlSaveFormatDefinition';
import type { ChatMessage } from '../../../../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../../../../src/book-components/Chat/types/ChatParticipant';
import { createChatExportFilename } from '../../../../../../../../src/book-components/Chat/save/_common/createChatExportFilename';
import { NextRequest, NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { getCurrentUser, type UserInfo } from '@/src/utils/getCurrentUser';
import { renderHtmlToPdfOnServer } from '@/src/utils/chatExport/renderHtmlToPdfOnServer';
import { sanitizeChatPdfExportHtml } from '@/src/utils/chatExport/sanitizeChatPdfExportHtml';

/**
 * PDF export requires the Node.js runtime because it depends on Playwright.
 */
export const runtime = 'nodejs';

/**
 * Maximum chat PDF exports one signed-in user can request per rate-limit window.
 *
 * @private internal constant for POST /api/chat/export/pdf
 */
const CHAT_PDF_EXPORT_MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Sliding-window length for chat PDF export rate limiting.
 *
 * @private internal constant for POST /api/chat/export/pdf
 */
const CHAT_PDF_EXPORT_RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * In-memory PDF export request timestamps keyed by authenticated user.
 *
 * @private internal constant for POST /api/chat/export/pdf
 */
const CHAT_PDF_EXPORT_RATE_LIMIT_BUCKETS: Map<string, Array<number>> = new Map();

/**
 * Minimal request payload accepted by the chat PDF export endpoint.
 *
 * @private internal type for POST /api/chat/export/pdf
 */
type ChatPdfExportRequestBody = {
    readonly title: string;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly participants: ReadonlyArray<ChatParticipant>;
};

/**
 * Result of the chat PDF export rate-limit check.
 *
 * @private internal type for POST /api/chat/export/pdf
 */
type ChatPdfExportRateLimitResult = {
    readonly isAllowed: boolean;
    readonly retryAfterSeconds: number;
};

/**
 * Builds a server-rendered PDF from the standalone HTML chat export.
 */
export async function POST(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitCheck = checkChatPdfExportRateLimit(currentUser);
    if (!rateLimitCheck.isAllowed) {
        return NextResponse.json(
            {
                error: spaceTrim(`
                    Rate limit exceeded for \`PDF\` chat exports.

                    **Limit:** ${CHAT_PDF_EXPORT_MAX_REQUESTS_PER_WINDOW} requests per ${Math.round(
                    CHAT_PDF_EXPORT_RATE_LIMIT_WINDOW_MS / 1000,
                )} seconds.

                    Try again in **${rateLimitCheck.retryAfterSeconds}** seconds.
                `),
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(rateLimitCheck.retryAfterSeconds),
                },
            },
        );
    }

    let requestBody: ChatPdfExportRequestBody;

    try {
        requestBody = (await request.json()) as ChatPdfExportRequestBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    if (
        typeof requestBody?.title !== 'string' ||
        !Array.isArray(requestBody.messages) ||
        !Array.isArray(requestBody.participants)
    ) {
        return NextResponse.json(
            { error: 'Expected `title`, `messages`, and `participants` in the PDF export payload.' },
            { status: 400 },
        );
    }

    try {
        const html = sanitizeChatPdfExportHtml(
            buildChatHtml(requestBody.title, requestBody.messages, requestBody.participants),
        );
        const pdfBuffer = await renderHtmlToPdfOnServer(html);
        const filename = createChatExportFilename(requestBody.title, 'pdf');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': createChatPdfExportContentDisposition(filename),
            },
        });
    } catch (error) {
        console.error('Failed to export chat PDF:', error);
        return NextResponse.json({ error: 'Failed to export chat as PDF.' }, { status: 500 });
    }
}

/**
 * Applies a per-user sliding-window rate limit to Playwright-backed PDF exports.
 *
 * @param currentUser - Authenticated caller resolved from the request.
 * @returns Decision and retry timing for the current attempt.
 *
 * @private internal helper for POST /api/chat/export/pdf
 */
function checkChatPdfExportRateLimit(currentUser: UserInfo): ChatPdfExportRateLimitResult {
    const bucketKey = resolveChatPdfExportRateLimitUserKey(currentUser);
    const nowMs = Date.now();
    const windowStartMs = nowMs - CHAT_PDF_EXPORT_RATE_LIMIT_WINDOW_MS;
    const previousAttempts = CHAT_PDF_EXPORT_RATE_LIMIT_BUCKETS.get(bucketKey) || [];
    const recentAttempts = previousAttempts.filter((attemptTimeMs) => attemptTimeMs > windowStartMs);

    if (recentAttempts.length >= CHAT_PDF_EXPORT_MAX_REQUESTS_PER_WINDOW) {
        const oldestRelevantAttemptMs = recentAttempts[0]!;
        const retryAfterMs = Math.max(
            1_000,
            oldestRelevantAttemptMs + CHAT_PDF_EXPORT_RATE_LIMIT_WINDOW_MS - nowMs,
        );

        CHAT_PDF_EXPORT_RATE_LIMIT_BUCKETS.set(bucketKey, recentAttempts);

        return {
            isAllowed: false,
            retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
        };
    }

    recentAttempts.push(nowMs);
    CHAT_PDF_EXPORT_RATE_LIMIT_BUCKETS.set(bucketKey, recentAttempts);

    return {
        isAllowed: true,
        retryAfterSeconds: 0,
    };
}

/**
 * Resolves a stable rate-limit bucket key for one authenticated user.
 *
 * @param currentUser - Authenticated caller resolved from the request.
 * @returns Per-user bucket key.
 *
 * @private internal helper for POST /api/chat/export/pdf
 */
function resolveChatPdfExportRateLimitUserKey(currentUser: UserInfo): string {
    if (typeof currentUser.id === 'number' && Number.isFinite(currentUser.id)) {
        return `user:${currentUser.id}`;
    }

    return `username:${currentUser.username.trim().toLowerCase()}`;
}

/**
 * Builds a standards-compatible attachment header with both quoted ASCII
 * fallback and RFC 5987 UTF-8 filename.
 *
 * @param filename - Sanitized chat export filename.
 * @returns Value for the `Content-Disposition` header.
 *
 * @private internal helper for POST /api/chat/export/pdf
 */
function createChatPdfExportContentDisposition(filename: string): string {
    const fallbackFilename = createChatPdfExportFallbackFilename(filename);
    const encodedFilename = encodeRFC5987Value(filename);

    return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`;
}

/**
 * Creates a quoted-string-safe ASCII fallback filename.
 *
 * @param filename - Preferred filename.
 * @returns Filename safe for a quoted `Content-Disposition` parameter.
 *
 * @private internal helper for POST /api/chat/export/pdf
 */
function createChatPdfExportFallbackFilename(filename: string): string {
    const fallbackFilename = filename
        .replace(/[^\x20-\x7e]/g, '_')
        .replace(/[\r\n"\\/;]/g, '_')
        .trim();

    return fallbackFilename || 'chat-export.pdf';
}

/**
 * Encodes a `Content-Disposition` filename according to RFC 5987.
 *
 * @param value - Raw filename value.
 * @returns Percent-encoded filename.
 *
 * @private internal helper for POST /api/chat/export/pdf
 */
function encodeRFC5987Value(value: string): string {
    return encodeURIComponent(value).replace(/['()*]/g, (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}
