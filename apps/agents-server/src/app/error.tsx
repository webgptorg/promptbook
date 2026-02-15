'use client';

import Link from 'next/link';

/**
 * Describes a suggestion presented to the user on the failure surface.
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
 * Creates a deterministic digest from the provided error so operators can correlate logs.
 *
 * @param error - The captured exception that triggered the boundary.
 * @returns A zero-padded unsigned 32-bit hash string.
 *
 * @private
 */
function createErrorDigest(error: Error | null): string {
    const hashSource = error?.stack ?? error?.message ?? 'unknown error';
    let hash = 0;

    for (let i = 0; i < hashSource.length; i += 1) {
        hash = Math.imul(31, hash) + hashSource.charCodeAt(i);
    }

    return (hash >>> 0).toString().padStart(10, '0');
}

/**
 * Formats the hero paragraph that mirrors the default error copy while keeping it friendly.
 *
 * @param error - The active error instance.
 * @param serverName - Server name or hostname provided by the deployment.
 * @returns A text snippet that summarizes what happened.
 *
 * @private
 */
function describeError(error: Error | null, serverName: string): string {
    if (error?.message) {
        return `${error.message.trim()} - the server for ${serverName} logged this failure.`;
    }

    return `A server-side exception happened while loading ${serverName}. The logs captured more detail.`;
}

/**
 * Secondary call-to-action metadata displayed inside the error surface.
 *
 * @param error - The Next.js error boundary payload.
 * @param reset - Callback that retries the failed navigation.
 *
 * @private
 */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
    const digest = createErrorDigest(error);
    const serverName = process.env.NEXT_PUBLIC_SERVER_NAME ?? 'Promptbook Agents Server';
    const heroDescription = describeError(error, serverName);

    return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-5xl space-y-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.65)] backdrop-blur">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-indigo-300">
                        <span className="text-lg">⚠️</span>
                        <span>Application error</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                            A server exception occurred while loading {serverName}.
                        </h1>
                        <p className="mt-3 text-lg text-slate-200 sm:text-xl">{heroDescription}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        Go to homepage
                    </Link>
                    <div className="ml-auto text-xs font-mono text-slate-300">
                        Digest: <span className="text-white">{digest}</span>
                    </div>
                </div>
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
                    Our team already receives the digest, but feel free to include it when reporting the issue so the logs can be correlated quickly.
                </p>
            </div>
        </div>
    );
}
