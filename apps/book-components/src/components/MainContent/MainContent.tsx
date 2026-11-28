import { ReactNode } from 'react';

/**
 * Handles main content.
 */
export function MainContent({ children }: { children: ReactNode }) {
    return <div className="md:col-span-2">{children}</div>;
}
