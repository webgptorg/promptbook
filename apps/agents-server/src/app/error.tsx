'use client';

import { ApplicationErrorPage } from '../components/ApplicationErrorPage/ApplicationErrorPage';
import type { ApplicationBoundaryError } from '../utils/errorReporting/applicationErrorHandling';

/**
 * Error page rendered by Next.js app-router boundary for unhandled route exceptions.
 *
 * @param error - The Next.js boundary payload.
 * @param reset - Callback that retries the failed navigation.
 *
 * @private
 */
export default function Error({ error, reset }: { error: ApplicationBoundaryError; reset: () => void }) {
    return <ApplicationErrorPage error={error} reset={reset} />;
}
