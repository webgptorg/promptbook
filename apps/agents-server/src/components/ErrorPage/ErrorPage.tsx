import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Supported width variants for the shared error-page card.
 */
type ErrorPageSize = 'default' | 'wide';

/**
 * Supported visual tones for shared error-page actions.
 */
type ErrorPageActionTone = 'primary' | 'secondary';

/**
 * Width class names used by the shared error-page card.
 */
const ERROR_PAGE_PANEL_WIDTH_CLASS_NAME: Record<ErrorPageSize, string> = {
    default: 'max-w-md',
    wide: 'max-w-3xl',
};

/**
 * Shared class names for branded error-page actions.
 */
const ERROR_PAGE_ACTION_CLASS_NAME: Record<ErrorPageActionTone, string> = {
    primary:
        'inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700',
    secondary:
        'inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100',
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
 * Props accepted by the shared error-page link action.
 */
type ErrorPageLinkActionProps = {
    /**
     * Destination URL.
     */
    href: string;

    /**
     * Optional styling tone.
     */
    tone?: ErrorPageActionTone;

    /**
     * Action label content.
     */
    children: ReactNode;
};

/**
 * Props accepted by the shared error-page button action.
 */
type ErrorPageButtonActionProps = Omit<ComponentProps<'button'>, 'children'> & {
    /**
     * Optional styling tone.
     */
    tone?: ErrorPageActionTone;

    /**
     * Action label content.
     */
    children: ReactNode;
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

/**
 * Shared link action for branded error pages.
 */
export function ErrorPageLinkAction({ href, tone = 'primary', children }: ErrorPageLinkActionProps) {
    return (
        <Link href={href} className={ERROR_PAGE_ACTION_CLASS_NAME[tone]}>
            {children}
        </Link>
    );
}

/**
 * Shared button action for branded error pages.
 */
export function ErrorPageButtonAction({
    tone = 'primary',
    type = 'button',
    className,
    children,
    ...props
}: ErrorPageButtonActionProps) {
    const toneClassName = ERROR_PAGE_ACTION_CLASS_NAME[tone];

    return (
        <button type={type} className={className ? `${toneClassName} ${className}` : toneClassName} {...props}>
            {children}
        </button>
    );
}
