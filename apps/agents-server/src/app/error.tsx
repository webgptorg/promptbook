'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ErrorPage as BasicErrorPage } from '../components/ErrorPage/ErrorPage';
import {
    APPLICATION_ERROR_REPORT_ENDPOINT,
    type ApplicationBoundaryError,
    type ApplicationErrorReportPayload,
    type ApplicationErrorVariant,
    DEFAULT_APPLICATION_ERROR_SERVER_NAME,
    createApplicationErrorDigest,
    createApplicationErrorHeadline,
    createApplicationErrorReportPayload,
    describeApplicationError,
    resolveApplicationErrorVariant,
} from '../utils/errorReporting/applicationErrorHandling';

/**
 * Suggestions shown in the advanced error variant to help users recover.
 *
 * @private
 */
const troubleshootingSteps = [
    {
        title: 'Refresh the route',
        detail: 'Try "Try again" so the last navigation runs with fresh cookies, network state, and session data.',
    },
    {
        title: 'Share the digest',
        detail: 'Copy the digest and the timestamp before reporting the problem so operators can match the logs quickly.',
    },
    {
        title: 'Check the system status',
        detail: 'If the issue keeps happening, contact your admin or hosting team so they can inspect the server logs.',
    },
];

/**
 * Props accepted by shared action controls used across error variants.
 *
 * @private
 */
type ApplicationErrorActionsProps = {
    /**
     * Callback that retries the failed route transition.
     */
    reset: () => void;

    /**
     * Digest value displayed for operator correlation.
     */
    digest: string;

    /**
     * Styling classes for the outer action row.
     */
    containerClassName: string;

    /**
     * Styling classes for the primary retry button.
     */
    retryButtonClassName: string;

    /**
     * Styling classes for the secondary homepage link.
     */
    homeButtonClassName: string;

    /**
     * Styling classes for the digest text block.
     */
    digestClassName: string;
};

/**
 * Shared primary/secondary actions rendered in both simple and advanced variants.
 *
 * @param props - Action rendering props.
 *
 * @private
 */
function ApplicationErrorActions({
    reset,
    digest,
    containerClassName,
    retryButtonClassName,
    homeButtonClassName,
    digestClassName,
}: ApplicationErrorActionsProps) {
    return (
        <div className={containerClassName}>
            <button type="button" onClick={() => reset()} className={retryButtonClassName}>
                Try again
            </button>
            <Link href="/" className={homeButtonClassName}>
                Go to homepage
            </Link>
            <div className={digestClassName}>
                Digest: <span className="text-current">{digest}</span>
            </div>
        </div>
    );
}

/**
 * Props accepted by the simple error variant renderer.
 *
 * @private
 */
type SimpleApplicationErrorViewProps = {
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
     * Callback that retries the failed route transition.
     */
    reset: () => void;
};

/**
 * Compact application error presentation for lightweight deployments.
 *
 * @param props - Display props for the simple variant.
 *
 * @private
 */
function SimpleApplicationErrorView({ headline, description, digest, reset }: SimpleApplicationErrorViewProps) {
    return (
        <BasicErrorPage title="Application error" message={headline}>
            <p className="mb-5 text-center text-sm text-gray-600">{description}</p>
            <ApplicationErrorActions
                reset={reset}
                digest={digest}
                containerClassName="flex flex-col items-center gap-3"
                retryButtonClassName="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                homeButtonClassName="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                digestClassName="text-xs font-mono text-gray-500"
            />
        </BasicErrorPage>
    );
}

/**
 * Props accepted by the advanced error variant renderer.
 *
 * @private
 */
type AdvancedApplicationErrorViewProps = {
    /**
     * Primary headline shared with simple mode.
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
     * Callback that retries the failed route transition.
     */
    reset: () => void;
};

/**
 * Full-screen detailed error presentation for troubleshooting-heavy environments.
 *
 * @param props - Display props for the advanced variant.
 *
 * @private
 */
function AdvancedApplicationErrorView({ headline, description, digest, reset }: AdvancedApplicationErrorViewProps) {
    return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-5xl space-y-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.65)] backdrop-blur">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-indigo-300">
                        <span className="text-lg">⚠️</span>
                        <span>Application error</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{headline}</h1>
                        <p className="mt-3 text-lg text-slate-200 sm:text-xl">{description}</p>
                    </div>
                </div>
                <ApplicationErrorActions
                    reset={reset}
                    digest={digest}
                    containerClassName="flex flex-wrap items-center gap-3"
                    retryButtonClassName="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                    homeButtonClassName="inline-flex items-center justify-center rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    digestClassName="ml-auto text-xs font-mono text-slate-300"
                />
                <div className="grid gap-4 sm:grid-cols-3">
                    {troubleshootingSteps.map((step) => (
                        <article
                            key={step.title}
                            className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/40"
                        >
                            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-200">{step.title}</p>
                            <p className="mt-2 text-sm text-slate-200">{step.detail}</p>
                        </article>
                    ))}
                </div>
                <p className="text-xs text-slate-400">
                    Our team already receives this report in Sentry, but feel free to include the digest when reporting
                    the issue so the logs can be correlated quickly.
                </p>
            </div>
        </div>
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
 * Error page rendered by Next.js app-router boundary for unhandled route exceptions.
 *
 * @param error - The Next.js boundary payload.
 * @param reset - Callback that retries the failed navigation.
 *
 * @private
 */
export default function ApplicationErrorPage({ error, reset }: { error: ApplicationBoundaryError; reset: () => void }) {
    const variant: ApplicationErrorVariant = resolveApplicationErrorVariant(
        process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT,
    );
    const digest = createApplicationErrorDigest(error);
    const serverName = process.env.NEXT_PUBLIC_SERVER_NAME ?? DEFAULT_APPLICATION_ERROR_SERVER_NAME;
    const headline = createApplicationErrorHeadline(serverName);
    const description = describeApplicationError(error, serverName);
    const lastReportedErrorRef = useRef<ApplicationBoundaryError | null>(null);

    useEffect(() => {
        if (lastReportedErrorRef.current === error) {
            return;
        }

        lastReportedErrorRef.current = error;

        const reportPayload = createApplicationErrorReportPayload(
            error,
            digest,
            serverName,
            variant,
            window.location.href,
        );

        void reportApplicationError(reportPayload).catch((reportingError) => {
            console.error('Failed to report application error to Sentry forwarding endpoint.', reportingError);
        });
    }, [digest, error, serverName, variant]);

    if (variant === 'simple') {
        return <SimpleApplicationErrorView headline={headline} description={description} digest={digest} reset={reset} />;
    }

    return <AdvancedApplicationErrorView headline={headline} description={description} digest={digest} reset={reset} />;
}
