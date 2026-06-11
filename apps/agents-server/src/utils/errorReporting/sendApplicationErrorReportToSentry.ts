import * as Sentry from '@sentry/nextjs';
import type { ApplicationErrorReportPayload } from './applicationErrorHandling';
import { enrichSentryStorePayloadWithAgentsServerContext } from './agentsServerSentryContext';
import {
    createSentryTimestamp,
    resolveRequiredSentryDsn,
    sendSentryStorePayload,
    type SentryStorePayload,
} from './sentryStore';

/**
 * Logger name visible in Sentry events.
 */
const SENTRY_APPLICATION_ERROR_LOGGER = 'agents-server.application-error';

/**
 * Creates the Sentry-compatible JSON payload from the application report.
 *
 * @param report - Browser-generated application error report.
 * @returns Sentry store payload.
 */
function createSentryStorePayload(report: ApplicationErrorReportPayload): SentryStorePayload {
    return enrichSentryStorePayloadWithAgentsServerContext({
        platform: 'javascript',
        level: 'error',
        logger: SENTRY_APPLICATION_ERROR_LOGGER,
        timestamp: createSentryTimestamp(),
        message: report.errorMessage,
        server_name: report.serverName,
        tags: {
            digest: report.digest,
            variant: report.variant,
            source: 'next-app-error-boundary',
        },
        exception: {
            values: [
                {
                    type: report.errorName,
                    value: report.errorMessage,
                },
            ],
        },
        extra: {
            nextDigest: report.nextDigest ?? null,
            stack: report.errorStack ?? null,
            pageUrl: report.pageUrl ?? null,
            reportedAt: report.reportedAt,
        },
    });
}

/**
 * Sends an application error report to Sentry.
 *
 * @param report - Structured browser report payload.
 */
export async function sendApplicationErrorReportToSentry(report: ApplicationErrorReportPayload): Promise<void> {
    const sentryPayload = createSentryStorePayload(report);

    if (Sentry.getClient()) {
        Sentry.captureException(createApplicationErrorSdkException(report, sentryPayload), {
            level: sentryPayload.level,
            tags: sentryPayload.tags,
            extra: sentryPayload.extra,
        });
        await Sentry.flush(2000);
        return;
    }

    await sendSentryStorePayload(sentryPayload, resolveRequiredSentryDsn());
}

/**
 * Rebuilds an `Error` object from a browser application report so the SDK can parse stack frames.
 *
 * @param report - Browser-generated application error report.
 * @param sentryPayload - Structured Sentry payload created from the report.
 * @returns Error object with the original browser stack when available.
 */
function createApplicationErrorSdkException(
    report: ApplicationErrorReportPayload,
    sentryPayload: SentryStorePayload,
): Error {
    const error = new Error(sentryPayload.message);

    error.name = report.errorName || 'Error';

    if (report.errorStack?.trim()) {
        error.stack = report.errorStack;
    }

    return error;
}
