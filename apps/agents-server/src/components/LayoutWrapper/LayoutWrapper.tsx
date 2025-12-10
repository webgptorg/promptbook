'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { UserInfo } from '../../utils/getCurrentUser';
import { Footer, type FooterLink } from '../Footer/Footer';
import { Header } from '../Header/Header';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    currentUser: UserInfo | null;
    serverName: string;
    serverLogoUrl: string | null;
    agents: Array<AgentBasicInformation>;
    isFooterShown: boolean;
    footerLinks: Array<FooterLink>;
    federatedServers: Array<{ url: string; title: string }>;
};

export function LayoutWrapper({
    children,
    isAdmin,
    currentUser,
    serverName,
    serverLogoUrl,
    agents,
    isFooterShown,
    footerLinks,
    federatedServers,
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isHeadless = searchParams.has('headless');
    // const isAdminChatPage = pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isHeaderHidden = false; // pathname?.includes('/chat') && !isAdminChatPage;
    const isFooterHiddenOnPage = pathname ? /^\/agents\/[^/]+\/(book|chat|book\+chat)$/.test(pathname) : false;

    if (isHeaderHidden || isHeadless) {
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
                federatedServers={federatedServers}
            />
            <main className={`pt-[60px]`}>{children}</main>
            {isFooterShown && !isFooterHiddenOnPage && <Footer extraLinks={footerLinks} />}
        </>
    );
}
