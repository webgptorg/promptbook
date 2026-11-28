'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    APPLICATION_ERROR_REPORT_ENDPOINT,
    type ApplicationBoundaryError,
    type ApplicationErrorReportPayload,
    type ApplicationErrorVariant,
    DEFAULT_APPLICATION_ERROR_SERVER_NAME,
    createApplicationErrorReportFilename,
    createApplicationErrorReportMarkdown,
    createApplicationErrorDigest,
    createApplicationErrorHeadline,
    createApplicationErrorReportPayload,
    describeApplicationError,
    isApplicationErrorRecoverableByHardRefresh,
    resolveApplicationErrorVariant,
} from '../../utils/errorReporting/applicationErrorHandling';
import { refreshApplicationDocument } from '../../utils/errorReporting/refreshApplicationDocument';
import { ErrorPageButtonAction, ErrorPageLinkAction } from '../ErrorPage/ErrorPage';
import { InternalServerErrorPage } from '../InternalServerErrorPage/InternalServerErrorPage';

/**
 * Suggestions shown in the advanced error variant to help users recover.
 *
 * @private
 */
const troubleshootingSteps = [
    {
        title: 'Refresh the route',
        detail: 'Use the primary action so the page can retry with fresh cookies, network state, and build assets.',
    },
    {
        title: 'Share the digest',
        detail: 'Copy or save the markdown report before reporting the problem so operators can match logs quickly.',
    },
    {
        title: 'Check the system status',
        detail: 'If the issue keeps happening, contact your admin or hosting team so they can inspect the server logs.',
    },
] as const;

/**
 * Duration in milliseconds before temporary report-action feedback clears.
 *
 * @private
 */
const REPORT_ACTION_FEEDBACK_DURATION_MS = 2500;

/**
 * Delay before one recoverable stale-asset error triggers an automatic full-document refresh.
 *
 * @private
 */
const APPLICATION_ERROR_AUTO_REFRESH_DELAY_MS = 1500;

/**
 * Prefix used for session-scoped stale-asset refresh guards.
 *
 * @private
 */
const APPLICATION_ERROR_AUTO_REFRESH_STORAGE_KEY_PREFIX = 'promptbook.application-error-hard-refresh';

/**
 * Writes plain text to the user clipboard.
 *
 * @param text - Text content to copy.
 * @throws Error when clipboard API is unavailable.
 *
 * @private
 */
async function copyPlainTextToClipboard(text: string): Promise<void> {
    if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable.');
    }

    await navigator.clipboard.writeText(text);
}

/**
 * Triggers a browser download for one markdown report.
 *
 * @param reportMarkdown - Markdown content to save.
 * @param filename - Target filename.
 *
 * @private
 */
function downloadMarkdownReport(reportMarkdown: string, filename: string): void {
    const reportBlob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const reportUrl = URL.createObjectURL(reportBlob);
    const anchor = document.createElement('a');
    anchor.href = reportUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(reportUrl);
}

/**
 * Builds the session-storage key used to ensure one stale-asset error only auto-refreshes once per URL and digest.
 *
 * @param pageUrl - Browser URL where the error happened.
 * @param digest - Deterministic digest rendered for the error.
 * @returns Stable session-storage key for the current recoverable error.
 *
 * @private
 */
function createApplicationErrorAutoRefreshStorageKey(pageUrl: string, digest: string): string {
    return `${APPLICATION_ERROR_AUTO_REFRESH_STORAGE_KEY_PREFIX}:${pageUrl}:${digest}`;
}

/**
 * Props accepted by shared action controls used across error variants.
 *
 * @private
 */
type ApplicationErrorActionsProps = {
    /**
     * Digest value displayed for operator correlation.
     */
    digest: string;

    /**
     * Full markdown report text used by copy/save controls.
     */
    reportMarkdown: string;

    /**
     * Default filename used by the markdown save action.
     */
    reportFilename: string;

    /**
     * Primary action label rendered on the left-most action button.
     */
    primaryActionLabel: string;

    /**
     * Callback used by the left-most primary action button.
     */
    onPrimaryAction: () => void;
};

/**
 * Shared primary/secondary actions rendered in both simple and advanced variants.
 *
 * @param props - Action rendering props.
 *
 * @private
 */
function ApplicationErrorActions({
    digest,
    reportMarkdown,
    reportFilename,
    primaryActionLabel,
    onPrimaryAction,
}: ApplicationErrorActionsProps) {
    const [reportFeedback, setReportFeedback] = useState<string | null>(null);
    const reportFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Renders short-lived action feedback under report controls.
     *
     * @param feedback - Human-friendly feedback label.
     */
    const showReportFeedback = (feedback: string): void => {
        if (reportFeedbackTimeoutRef.current !== null) {
            clearTimeout(reportFeedbackTimeoutRef.current);
            reportFeedbackTimeoutRef.current = null;
        }

        setReportFeedback(feedback);
        reportFeedbackTimeoutRef.current = setTimeout(() => {
            setReportFeedback(null);
            reportFeedbackTimeoutRef.current = null;
        }, REPORT_ACTION_FEEDBACK_DURATION_MS);
    };

    /**
     * Clears pending report-feedback timers when controls unmount.
     */
    useEffect(() => {
        return () => {
            if (reportFeedbackTimeoutRef.current !== null) {
                clearTimeout(reportFeedbackTimeoutRef.current);
                reportFeedbackTimeoutRef.current = null;
            }
        };
    }, []);

    /**
     * Copies the full markdown report to clipboard.
     */
    const handleCopyReport = async (): Promise<void> => {
        try {
            await copyPlainTextToClipboard(reportMarkdown);
            showReportFeedback('Report copied to clipboard.');
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            showReportFeedback(`Copy failed: ${detail}`);
        }
    };

    /**
     * Saves the full markdown report as a local file.
     */
    const handleSaveReport = (): void => {
        downloadMarkdownReport(reportMarkdown, reportFilename);
        showReportFeedback(`Saved report as ${reportFilename}.`);
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
                <ErrorPageButtonAction onClick={onPrimaryAction}>{primaryActionLabel}</ErrorPageButtonAction>
                <ErrorPageLinkAction href="/" tone="secondary">
                    Go to homepage
                </ErrorPageLinkAction>
                <ErrorPageButtonAction tone="secondary" onClick={() => void handleCopyReport()}>
                    Copy
                </ErrorPageButtonAction>
                <ErrorPageButtonAction tone="secondary" onClick={handleSaveReport}>
                    Save
                </ErrorPageButtonAction>
            </div>
            <div className="text-xs font-mono text-gray-500">
                Digest: <span className="text-current">{digest}</span>
            </div>
            {reportFeedback ? (
                <p className="text-xs text-gray-600" role="status" aria-live="polite">
                    {reportFeedback}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Props accepted by the shared application error renderer.
 *
 * @private
 */
type ApplicationErrorViewProps = {
    /**
     * Primary headline shared with advanced mode.
     */
    headline: string;

    /**
     * Friendly paragraph explaining what happened.
     */
    description: string;

    /**
     * Digest value displayed for support correlation.
     */
    digest: string;

    /**
     * Full markdown report text used by copy/save controls.
     */
    reportMarkdown: string;

    /**
     * Default filename used by the markdown save action.
     */
    reportFilename: string;

    /**
     * Callback that retries the failed route transition.
     */
    reset: () => void;

    /**
     * Width variant used by the shared error shell.
     */
    size?: 'default' | 'wide';

    /**
     * Primary action label rendered on the left-most action button.
     */
    primaryActionLabel: string;

    /**
     * Callback used by the left-most primary action button.
     */
    onPrimaryAction: () => void;

    /**
     * Optional supplementary content rendered beneath shared actions.
     */
    supplementaryContent?: ReactNode;

    /**
     * Optional recovery note rendered between the actions and supplementary content.
     */
    recoveryNotice?: ReactNode;
};

/**
 * Shared application error presentation built on the same shell as other branded error pages.
 *
 * @param props - Display props for the branded application error page.
 *
 * @private
 */
function ApplicationErrorView({
    headline,
    description,
    digest,
    reportMarkdown,
    reportFilename,
    size = 'default',
    primaryActionLabel,
    onPrimaryAction,
    recoveryNotice,
    supplementaryContent,
}: ApplicationErrorViewProps) {
    return (
        <InternalServerErrorPage headline={headline} description={description} size={size}>
            <ApplicationErrorActions
                digest={digest}
                reportMarkdown={reportMarkdown}
                reportFilename={reportFilename}
                primaryActionLabel={primaryActionLabel}
                onPrimaryAction={onPrimaryAction}
            />
            {recoveryNotice}
            {supplementaryContent}
        </InternalServerErrorPage>
    );
}

/**
 * Compact application error presentation for lightweight deployments.
 *
 * @private
 */
function SimpleApplicationErrorView(props: ApplicationErrorViewProps) {
    return <ApplicationErrorView {...props} />;
}

/**
 * Detailed application error presentation for troubleshooting-heavy environments.
 *
 * @param props - Display props for the advanced variant.
 *
 * @private
 */
function AdvancedApplicationErrorView(props: ApplicationErrorViewProps) {
    return (
        <ApplicationErrorView
            {...props}
            size="wide"
            supplementaryContent={
                <>
                    <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
                        {troubleshootingSteps.map((step) => (
                            <article key={step.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <p className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                                    {step.title}
                                </p>
                                <p className="mt-2 text-sm text-gray-600">{step.detail}</p>
                            </article>
                        ))}
                    </div>
                    <p className="mt-6 text-center text-xs text-gray-500">
                        Our team already receives this report in Sentry, but feel free to include the digest when
                        reporting the issue so the logs can be correlated quickly.
                    </p>
                </>
            }
        />
    );
}

/**
 * Sends an application error payload to the server-side Sentry forwarding endpoint.
 *
 * @param payload - Serialized browser-side application error details.
 *
 * @private
 */
async function reportApplicationError(payload: ApplicationErrorReportPayload): Promise<void> {
    const response = await fetch(APPLICATION_ERROR_REPORT_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
    });

    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Failed to report application error (${response.status}): ${responseBody}`);
    }
}

/**
 * Props accepted by the reusable app-router error page component.
 */
type ApplicationErrorPageProps = {
    /**
     * The Next.js boundary payload.
     */
    error: ApplicationBoundaryError;

    /**
     * Callback that retries the failed navigation.
     */
    reset: () => void;
};

/**
 * Branded error page rendered by Next.js app-router boundaries for unhandled exceptions.
 *
 * @param props - Boundary payload and reset callback.
 * @returns Shared branded `500 / Internal Server Error` experience.
 */
export function ApplicationErrorPage({ error, reset }: ApplicationErrorPageProps) {
    const variant: ApplicationErrorVariant = resolveApplicationErrorVariant(
        process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT,
    );
    const digest = createApplicationErrorDigest(error);
    const serverName = process.env.NEXT_PUBLIC_SERVER_NAME ?? DEFAULT_APPLICATION_ERROR_SERVER_NAME;
    const isRecoverableByHardRefresh = isApplicationErrorRecoverableByHardRefresh(error);
    const headline = createApplicationErrorHeadline(serverName);
    const description = describeApplicationError(error, serverName);
    const [pageUrl, setPageUrl] = useState<string | undefined>(undefined);
    const [hasAutomaticRefreshAlreadyBeenAttempted, setHasAutomaticRefreshAlreadyBeenAttempted] = useState(false);
    const reportPayload = useMemo(
        () => createApplicationErrorReportPayload(error, digest, serverName, variant, pageUrl),
        [digest, error, pageUrl, serverName, variant],
    );
    const reportMarkdown = useMemo(
        () => createApplicationErrorReportMarkdown(reportPayload, headline, description),
        [description, headline, reportPayload],
    );
    const reportFilename = useMemo(() => createApplicationErrorReportFilename(reportPayload), [reportPayload]);
    const lastReportedErrorRef = useRef<ApplicationBoundaryError | null>(null);

    useEffect(() => {
        setPageUrl(window.location.href);
    }, []);

    useEffect(() => {
        if (!pageUrl || !isRecoverableByHardRefresh) {
            setHasAutomaticRefreshAlreadyBeenAttempted(false);
            return undefined;
        }

        const storageKey = createApplicationErrorAutoRefreshStorageKey(pageUrl, digest);

        try {
            const hasStoredRefreshAttempt = window.sessionStorage.getItem(storageKey) === 'done';
            if (hasStoredRefreshAttempt) {
                setHasAutomaticRefreshAlreadyBeenAttempted(true);
                return undefined;
            }

            window.sessionStorage.setItem(storageKey, 'done');
        } catch {
            // Some browser privacy modes may block session storage; the one-shot reload remains best-effort.
        }

        const timeout = window.setTimeout(() => {
            refreshApplicationDocument();
        }, APPLICATION_ERROR_AUTO_REFRESH_DELAY_MS);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [digest, isRecoverableByHardRefresh, pageUrl]);

    useEffect(() => {
        if (!pageUrl) {
            return;
        }

        if (lastReportedErrorRef.current === error) {
            return;
        }

        lastReportedErrorRef.current = error;

        void reportApplicationError(reportPayload).catch((reportingError) => {
            console.error('Failed to report application error to Sentry forwarding endpoint.', reportingError);
        });
    }, [error, pageUrl, reportPayload]);

    const primaryActionLabel = isRecoverableByHardRefresh ? 'Refresh now' : 'Try again';
    const handlePrimaryAction = () => {
        if (isRecoverableByHardRefresh) {
            refreshApplicationDocument();
            return;
        }

        reset();
    };
    const recoveryNotice = isRecoverableByHardRefresh ? (
        <p className="mt-6 text-center text-sm text-gray-600">
            {hasAutomaticRefreshAlreadyBeenAttempted
                ? 'Automatic refresh already ran once. If the newest assets still do not load, use "Refresh now" or share the digest with your administrator.'
                : 'Refreshing this page automatically once so the latest application files can be loaded.'}
        </p>
    ) : undefined;

    if (variant === 'simple') {
        return (
            <SimpleApplicationErrorView
                headline={headline}
                description={description}
                digest={digest}
                reportMarkdown={reportMarkdown}
                reportFilename={reportFilename}
                reset={reset}
                recoveryNotice={recoveryNotice}
                primaryActionLabel={primaryActionLabel}
                onPrimaryAction={handlePrimaryAction}
            />
        );
    }

    return (
        <AdvancedApplicationErrorView
            headline={headline}
            description={description}
            digest={digest}
            reportMarkdown={reportMarkdown}
            reportFilename={reportFilename}
            reset={reset}
            recoveryNotice={recoveryNotice}
            primaryActionLabel={primaryActionLabel}
            onPrimaryAction={handlePrimaryAction}
        />
    );
}
