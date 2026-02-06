'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { MenuHoistingProvider } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { AsyncDialogsProvider } from '../AsyncDialogs/AsyncDialogsProvider';
import type { UserInfo } from '../../utils/getCurrentUser';
import type { AgentNaming } from '../../utils/agentNaming';
import { Footer, type FooterLink } from '../Footer/Footer';
import { Header } from '../Header/Header';
import { AgentNamingProvider } from '../AgentNaming/AgentNamingContext';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    currentUser: UserInfo | null;
    serverName: string;
    serverLogoUrl: string | null;
    agents: Array<AgentBasicInformation>;
    agentNaming: AgentNaming;
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
    agentNaming,
    isFooterShown,
    footerLinks,
    federatedServers,
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isHeadless = searchParams.has('headless');
    // const isAdminChatPage = pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isChatPage = pathname ? /^\/agents\/[^/]+\/chat$/.test(pathname) : false;
    const isHeaderHidden = false; // pathname?.includes('/chat') && !isAdminChatPage;
    const isFooterHiddenOnPage = pathname ? /^\/agents\/[^/]+\/(book|chat|book\+chat)$/.test(pathname) : false;

    return (
        <AsyncDialogsProvider>
            <AgentNamingProvider naming={agentNaming}>
                {isHeaderHidden || isHeadless ? (
                    <main className="pt-0">{children}</main>
                ) : (
                    <MenuHoistingProvider>
                        <Header
                            isAdmin={isAdmin}
                            currentUser={currentUser}
                            serverName={serverName}
                            serverLogoUrl={serverLogoUrl}
                            agents={agents}
                            federatedServers={federatedServers}
                        />
                        <main className={isChatPage ? `h-[100dvh] pt-[60px] overflow-hidden` : `pt-[60px]`}>
                            {children}
                        </main>
                        {isFooterShown && !isFooterHiddenOnPage && <Footer extraLinks={footerLinks} />}
                    </MenuHoistingProvider>
                )}
            </AgentNamingProvider>
        </AsyncDialogsProvider>
    );
}
