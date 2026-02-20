'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { MenuHoistingProvider } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import type { AgentNaming } from '../../utils/agentNaming';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { UserInfo } from '../../utils/getCurrentUser';
import { AgentNamingProvider } from '../AgentNaming/AgentNamingContext';
import { AsyncDialogsProvider } from '../AsyncDialogs/AsyncDialogsProvider';
import { ClientVersionMismatchListener } from '../ClientVersion/ClientVersionMismatchListener';
import { Footer, type FooterLink } from '../Footer/Footer';
import { Header } from '../Header/Header';
import { MetadataFlagsProvider } from '../MetadataFlags/MetadataFlagsContext';
import { PrivateModePreferencesProvider } from '../PrivateModePreferences/PrivateModePreferencesProvider';
import { SelfLearningPreferencesProvider } from '../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { SoundSystemProvider } from '../SoundSystemProvider/SoundSystemProvider';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    currentUser: UserInfo | null;
    serverName: string;
    serverLogoUrl: string | null;
    agents: Array<AgentOrganizationAgent>;
    agentFolders: Array<AgentOrganizationFolder>;
    agentNaming: AgentNaming;
    isFooterShown: boolean;
    footerLinks: Array<FooterLink>;
    federatedServers: Array<{ url: string; title: string }>;
    isExperimental: boolean;
    isFeedbackEnabled: boolean;
    /**
     * Indicates if the install-as-app option should be shown in agent menus.
     */
    readonly isExperimentalPwaAppEnabled: boolean;
    defaultIsSoundsOn: boolean;
    defaultIsVibrationOn: boolean;
};

export function LayoutWrapper({
    children,
    isAdmin,
    currentUser,
    serverName,
    serverLogoUrl,
    agents,
    agentFolders,
    agentNaming,
    isFooterShown,
    footerLinks,
    federatedServers,
    isExperimental,
    isFeedbackEnabled,
    isExperimentalPwaAppEnabled,
    defaultIsSoundsOn,
    defaultIsVibrationOn,
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isHeadless = searchParams.has('headless');
    // const isAdminChatPage = pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isChatPage = pathname ? /^\/agents\/[^/]+\/chat$/.test(pathname) : false;
    const isHeaderHidden = false; // pathname?.includes('/chat') && !isAdminChatPage;
    const isFooterHiddenOnPage = pathname ? /^\/agents\/[^/]+\/(book|chat|book\+chat)$/.test(pathname) : false;

    const mainClassName = isChatPage ? 'h-[100dvh] pt-[60px] overflow-hidden' : 'flex-1 pt-[60px]';

    return (
        <AsyncDialogsProvider>
            <AgentNamingProvider naming={agentNaming}>
                <PrivateModePreferencesProvider>
                    {isHeaderHidden || isHeadless ? (
                        <main className="pt-0">{children}</main>
                    ) : (
                        <SelfLearningPreferencesProvider>
                            <SoundSystemProvider
                                initialIsSoundsOn={defaultIsSoundsOn}
                                initialIsVibrationOn={defaultIsVibrationOn}
                            >
                                <ClientVersionMismatchListener />
                                <MenuHoistingProvider>
                                    <MetadataFlagsProvider value={{ isExperimentalPwaAppEnabled }}>
                                        <div className="flex min-h-screen flex-col">
                                            <Header
                                                isAdmin={isAdmin}
                                                currentUser={currentUser}
                                                serverName={serverName}
                                                serverLogoUrl={serverLogoUrl}
                                                agents={agents}
                                                agentFolders={agentFolders}
                                                federatedServers={federatedServers}
                                                isExperimental={isExperimental}
                                                isFeedbackEnabled={isFeedbackEnabled}
                                            />
                                            <main className={mainClassName}>{children}</main>
                                            {isFooterShown && !isFooterHiddenOnPage && (
                                                <Footer extraLinks={footerLinks} />
                                            )}
                                        </div>
                                    </MetadataFlagsProvider>
                                </MenuHoistingProvider>
                            </SoundSystemProvider>
                        </SelfLearningPreferencesProvider>
                    )}
                </PrivateModePreferencesProvider>
            </AgentNamingProvider>
        </AsyncDialogsProvider>
    );
}
