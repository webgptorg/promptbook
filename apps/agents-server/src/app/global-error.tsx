'use client';

import { ApplicationErrorPage } from '../components/ApplicationErrorPage/ApplicationErrorPage';
import type { ApplicationBoundaryError } from '../utils/errorReporting/applicationErrorHandling';
import { APPLICATION_FONT_VARIABLE_CLASS_NAME } from '../utils/applicationFonts';
import './globals.css';

/**
 * Global error page rendered by Next.js when the root layout or top-level render fails.
 *
 * @param error - The Next.js boundary payload.
 * @param reset - Callback that retries the failed navigation.
 * @returns Standalone branded document for top-level application failures.
 */
export default function GlobalError({ error, reset }: { error: ApplicationBoundaryError; reset: () => void }) {
    return (
        <html lang="en">
            <body className={`${APPLICATION_FONT_VARIABLE_CLASS_NAME} bg-white text-gray-900 antialiased`}>
                <ApplicationErrorPage error={error} reset={reset} />
            </body>
        </html>
    );
}
