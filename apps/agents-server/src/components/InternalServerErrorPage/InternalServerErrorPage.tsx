import type { ReactNode } from 'react';
import { ErrorPage } from '../ErrorPage/ErrorPage';

/**
 * Shared title rendered across branded internal-server-error experiences.
 */
const INTERNAL_SERVER_ERROR_TITLE = '500 / Internal Server Error';

/**
 * Props accepted by the shared internal-server-error presentation.
 */
type InternalServerErrorPageProps = {
    /**
     * Primary headline rendered below the error code.
     */
    headline: string;

    /**
     * Friendly descriptive paragraph rendered below the headline.
     */
    description: string;

    /**
     * Optional supplementary actions or troubleshooting content.
     */
    children?: ReactNode;

    /**
     * Width variant used by the shared error shell.
     */
    size?: 'default' | 'wide';
};

/**
 * Shared presentation for branded `500 / Internal Server Error` pages.
 */
export function InternalServerErrorPage({
    headline,
    description,
    children,
    size = 'default',
}: InternalServerErrorPageProps) {
    return (
        <ErrorPage title={INTERNAL_SERVER_ERROR_TITLE} message={headline} size={size}>
            <p className="mb-5 text-center text-sm text-gray-600">{description}</p>
            {children}
        </ErrorPage>
    );
}
