import * as Sentry from '@sentry/nextjs';
import { createAgentsServerSentryContext } from './utils/errorReporting/agentsServerSentryContext';
import { resolveServerSentryDsn, SENTRY_TRACES_SAMPLE_RATE } from './utils/errorReporting/sentrySdkConfig';

/**
 * Shared diagnostic context applied to server-side SDK events at initialization time.
 */
const agentsServerSentryContext = createAgentsServerSentryContext();

Sentry.init({
    dsn: resolveServerSentryDsn(),
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    environment: agentsServerSentryContext.environment,
    release: agentsServerSentryContext.release,
    initialScope: {
        tags: agentsServerSentryContext.tags,
        extra: agentsServerSentryContext.extra,
    },
});
