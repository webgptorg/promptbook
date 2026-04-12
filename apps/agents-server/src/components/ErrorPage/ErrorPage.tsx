import type { ReactNode } from 'react';

/**
 * Supported width variants for the shared error-page card.
 */
type ErrorPageSize = 'default' | 'wide';

/**
 * Width class names used by the shared error-page card.
 */
const ERROR_PAGE_PANEL_WIDTH_CLASS_NAME: Record<ErrorPageSize, string> = {
    default: 'max-w-md',
    wide: 'max-w-3xl',
};

/**
 * Props for error page.
 */
type ErrorPageProps = {
    /**
     * The title of the error page (e.g. "404 Not Found")
     */
    title: string;

    /**
     * The message to display to the user
     */
    message: string;

    /**
     * Optional children to display below the message (e.g. a button or form)
     */
    children?: ReactNode;

    /**
     * Width variant used for the inner error card.
     */
    size?: ErrorPageSize;
};

/**
 * A standard layout for error pages (404, 403, 500, etc.)
 */
export function ErrorPage({ title, message, children, size = 'default' }: ErrorPageProps) {
    const panelWidthClassName = ERROR_PAGE_PANEL_WIDTH_CLASS_NAME[size];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
            <div className={`w-full rounded-lg bg-white p-8 shadow-md ${panelWidthClassName}`}>
                <h1 className="text-3xl font-bold text-red-600 mb-4 text-center">{title}</h1>
                <p className="text-gray-700 mb-6 text-center">{message}</p>
                {children}
            </div>
        </div>
    );
}
