'use client';

import { usePathname } from 'next/navigation';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { UserInfo } from '../../utils/getCurrentUser';
import { Header } from '../Header/Header';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    currentUser: UserInfo | null;
    serverName: string;
    serverLogoUrl: string | null;
    agents: Array<AgentBasicInformation>;
};

export function LayoutWrapper({ children, isAdmin, currentUser, serverName, serverLogoUrl, agents }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isAdminChatPage =
        pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isHeaderHidden = pathname?.includes('/chat') && !isAdminChatPage;

    if (isHeaderHidden) {
        return <main className={`pt-0`}>{children}</main>;
    }

    return (
        <>
            <Header
                isAdmin={isAdmin}
                currentUser={currentUser}
                serverName={serverName}
                serverLogoUrl={serverLogoUrl}
                agents={agents}
            />
            <main className={`pt-[60px]`}>{children}</main>
        </>
    );
}
