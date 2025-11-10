import { ReactNode } from 'react';

export function MainContent({ children }: { children: ReactNode }) {
    return <div className="md:col-span-2">{children}</div>;
}
