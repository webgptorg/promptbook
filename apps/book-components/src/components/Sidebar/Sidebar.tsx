import { ReactNode } from 'react';

/**
 * Handles sidebar.
 */
export function Sidebar({ children }: { children: ReactNode }) {
    return <div className="md:col-span-1">{children}</div>;
}
