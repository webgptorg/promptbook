import { NextRequest, NextResponse } from 'next/server';
import {
    type ApplicationErrorReportPayload,
    resolveApplicationErrorVariant,
} from '../../../../utils/errorReporting/applicationErrorHandling';
import { sendApplicationErrorReportToSentry } from '../../../../utils/errorReporting/sendApplicationErrorReportToSentry';

/**
 * Maximum length accepted for short string fields in error reports.
 */
const MAX_TEXT_LENGTH = 4000;

/**
 * Maximum length accepted for stack traces.
 */
const MAX_STACK_LENGTH = 20000;

/**
 * Response payload used when the incoming report is invalid.
 */
const INVALID_REPORT_RESPONSE = { error: 'Invalid application error report payload.' };

/**
 * Narrows unknown values to plain object records.
 *
 * @param value - Value to validate.
 * @returns True when the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * Converts unknown values to bounded strings.
 *
 * @param value - Source value from request body.
 * @param maxLength - Maximum accepted string length.
 * @returns Trimmed string value, or undefined when value is not a string.
 */
function toBoundedString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    return value.trim().slice(0, maxLength);
}

/**
 * Parses raw request payload into a validated application error report.
 *
 * @param requestBody - Parsed request body.
 * @returns Valid report payload or null when payload is invalid.
 */
function parseApplicationErrorReportPayload(requestBody: unknown): ApplicationErrorReportPayload | null {
    if (!isRecord(requestBody)) {
        return null;
    }

    const errorName = toBoundedString(requestBody.errorName, MAX_TEXT_LENGTH);
    const errorMessage = toBoundedString(requestBody.errorMessage, MAX_TEXT_LENGTH);
    const digest = toBoundedString(requestBody.digest, MAX_TEXT_LENGTH);
    const serverName = toBoundedString(requestBody.serverName, MAX_TEXT_LENGTH);
    const reportedAt = toBoundedString(requestBody.reportedAt, MAX_TEXT_LENGTH);

    if (!errorName || !errorMessage || !digest || !serverName || !reportedAt) {
        return null;
    }

    const variantInput = toBoundedString(requestBody.variant, MAX_TEXT_LENGTH);
    const nextDigest = toBoundedString(requestBody.nextDigest, MAX_TEXT_LENGTH);
    const errorStack = toBoundedString(requestBody.errorStack, MAX_STACK_LENGTH);
    const pageUrl = toBoundedString(requestBody.pageUrl, MAX_TEXT_LENGTH);

    return {
        variant: resolveApplicationErrorVariant(variantInput),
        serverName,
        digest,
        nextDigest,
        errorName,
        errorMessage,
        errorStack,
        pageUrl,
        reportedAt,
    };
}

/**
 * Receives browser-side app-boundary reports and forwards them to Sentry.
 *
 * @param request - Incoming POST request with serialized browser error details.
 * @returns API response indicating success or validation/forwarding failure.
 */
export async function POST(request: NextRequest) {
    try {
        const requestBody = (await request.json()) as unknown;
        const report = parseApplicationErrorReportPayload(requestBody);

        if (!report) {
            return NextResponse.json(INVALID_REPORT_RESPONSE, { status: 400 });
        }

        await sendApplicationErrorReportToSentry(report);

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(INVALID_REPORT_RESPONSE, { status: 400 });
        }

        console.error('Failed to forward application error report to Sentry.', error);
        return NextResponse.json({ error: 'Failed to forward application error report to Sentry.' }, { status: 500 });
    }
}
