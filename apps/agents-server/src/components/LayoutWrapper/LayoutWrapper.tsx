'use client';

import { usePathname } from 'next/navigation';
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
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const isAdminChatPage =
        pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isHeaderHidden = pathname?.includes('/chat') && !isAdminChatPage;
    const isFooterHiddenOnPage = pathname ? /^\/agents\/[^/]+\/book(\+chat)?$/.test(pathname) : false;

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
            {isFooterShown && !isFooterHiddenOnPage && <Footer extraLinks={footerLinks} />}
        </>
    );
}
