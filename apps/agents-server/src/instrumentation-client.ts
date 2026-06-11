import * as Sentry from '@sentry/nextjs';
import {
    createSentrySdkTags,
    resolveBrowserSentryDsn,
    resolveSentrySdkEnvironment,
    resolveSentrySdkRelease,
    SENTRY_TRACE_PROPAGATION_TARGETS,
    SENTRY_TRACES_SAMPLE_RATE,
} from './utils/errorReporting/sentrySdkConfig';

Sentry.init({
    dsn: resolveBrowserSentryDsn(),
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    environment: resolveSentrySdkEnvironment(),
    release: resolveSentrySdkRelease(),
    integrations: [Sentry.browserTracingIntegration()],
    tracePropagationTargets: SENTRY_TRACE_PROPAGATION_TARGETS,
    initialScope: {
        tags: createSentrySdkTags(),
    },
});

/**
 * Reports app-router navigation spans to Sentry.
 *
 * @private Sentry hook for Next.js client navigation instrumentation
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
