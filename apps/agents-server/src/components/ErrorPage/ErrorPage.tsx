import type { ReactNode } from 'react';

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
};

/**
 * A standard layout for error pages (404, 403, 500, etc.)
 */
export function ErrorPage({ title, message, children }: ErrorPageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <h1 className="text-3xl font-bold text-red-600 mb-4 text-center">{title}</h1>
                <p className="text-gray-700 mb-6 text-center">{message}</p>
                {children}
            </div>
        </div>
    );
}
