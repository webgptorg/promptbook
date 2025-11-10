import { ReactNode } from 'react';

export function Sidebar({ children }: { children: ReactNode }) {
    return <div className="md:col-span-1">{children}</div>;
}
