'use client';

import { usePathname } from 'next/navigation';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { Header } from '../Header/Header';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    serverName: string;
    serverLogoUrl: string | null;
    agents: Array<AgentBasicInformation>;
};

export function LayoutWrapper({ children, isAdmin, serverName, serverLogoUrl, agents }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isHeaderHidden = pathname?.includes('/chat');

    if (isHeaderHidden) {
        return <main className={`pt-0`}>{children}</main>;
    }

    return (
        <>
            <Header isAdmin={isAdmin} serverName={serverName} serverLogoUrl={serverLogoUrl} agents={agents} />
            <main className={`pt-[60px]`}>{children}</main>
        </>
    );
}
