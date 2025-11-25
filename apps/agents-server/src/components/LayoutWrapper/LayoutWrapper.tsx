'use client';

import { usePathname } from 'next/navigation';
import { Header } from '../Header/Header';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
};

export function LayoutWrapper({ children, isAdmin }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isHeaderHidden = pathname?.includes('/chat');

    if (isHeaderHidden) {
        return <main className={`pt-0`}>{children}</main>;
    }

    return (
        <>
            <Header isAdmin={isAdmin} />
            <main className={`pt-[60px]`}>{children}</main>
        </>
    );
}
