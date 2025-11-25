'use client';

import { usePathname } from 'next/navigation';
import { Header } from '../Header/Header';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    serverName: string;
};

export function LayoutWrapper({ children, isAdmin, serverName }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isHeaderHidden = pathname?.includes('/chat');

    if (isHeaderHidden) {
        return <main className={`pt-0`}>{children}</main>;
    }

    return (
        <>
            <Header isAdmin={isAdmin} serverName={serverName} />
            <main className={`pt-[60px]`}>{children}</main>
        </>
    );
}
