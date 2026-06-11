import * as Sentry from '@sentry/nextjs';
import {
    createSentrySdkTags,
    resolveBrowserSentryDsn,
    resolveSentrySdkEnvironment,
    resolveSentrySdkRelease,
    SENTRY_TRACES_SAMPLE_RATE,
} from './utils/errorReporting/sentrySdkConfig';

Sentry.init({
    dsn: resolveBrowserSentryDsn(),
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    environment: resolveSentrySdkEnvironment(),
    release: resolveSentrySdkRelease(),
    initialScope: {
        tags: createSentrySdkTags(),
    },
});
