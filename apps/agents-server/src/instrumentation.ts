import * as Sentry from '@sentry/nextjs';

/**
 * Registers startup hooks for the Agents Server runtime.
 *
 * @returns Promise that resolves after startup hooks are loaded.
 * @private internal startup hook for Agents Server runtime
 */
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
        return;
    }

    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    try {
        await import('./sentry.server.config');

        const { registerServerErrorSentryLogging } = await import('./utils/errorReporting/registerServerErrorSentryLogging');
        registerServerErrorSentryLogging();

        const { registerNodeRuntimeInstrumentation } = await import('./instrumentation-node');
        await registerNodeRuntimeInstrumentation();
    } catch (error) {
        console.error('❌ Agents Server instrumentation hook failed before startup hooks finished.', {
            nextRuntime: process.env.NEXT_RUNTIME,
            nodeEnv: process.env.NODE_ENV,
            errorName: error instanceof Error ? error.name : undefined,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
        });
    }
}

/**
 * Reports request errors from the Next.js app router to Sentry.
 *
 * @private Sentry hook for Next.js request instrumentation
 */
export const onRequestError = Sentry.captureRequestError;
