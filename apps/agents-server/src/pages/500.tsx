import { HomeIcon } from 'lucide-react';
import Head from 'next/head';
import { ErrorPageLinkAction } from '../components/ErrorPage/ErrorPage';
import { InternalServerErrorPage } from '../components/InternalServerErrorPage/InternalServerErrorPage';
import {
    DEFAULT_APPLICATION_ERROR_SERVER_NAME,
    createApplicationErrorHeadline,
} from '../utils/errorReporting/applicationErrorHandling';

/**
 * Static headline shown when the production fallback `500` page renders outside the app router.
 */
const INTERNAL_SERVER_ERROR_HEADLINE = createApplicationErrorHeadline(
    process.env.NEXT_PUBLIC_SERVER_NAME ?? DEFAULT_APPLICATION_ERROR_SERVER_NAME,
);

/**
 * Generic description shown when the server fails before the app-router boundary can render.
 */
const INTERNAL_SERVER_ERROR_DESCRIPTION =
    'The server ran into an unexpected problem while loading this page. Please try again in a moment or return to the homepage.';

/**
 * Static branded fallback page used for production `500` responses.
 */
export default function Custom500Page() {
    return (
        <>
            <Head>
                <title>500 / Internal Server Error</title>
            </Head>
            <InternalServerErrorPage
                headline={INTERNAL_SERVER_ERROR_HEADLINE}
                description={INTERNAL_SERVER_ERROR_DESCRIPTION}
            >
                <div className="flex justify-center">
                    <ErrorPageLinkAction href="/">
                        <HomeIcon className="inline w-5 h-5 mr-2" />
                        Home
                    </ErrorPageLinkAction>
                </div>
            </InternalServerErrorPage>
        </>
    );
}
