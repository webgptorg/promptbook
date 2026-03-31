'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { MenuHoistingProvider } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import type { AgentNaming } from '../../utils/agentNaming';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { ChatFeedbackMode } from '../../utils/chatFeedbackMode';
import type { UserInfo } from '../../utils/getCurrentUser';
import { AgentNamingProvider } from '../AgentNaming/AgentNamingContext';
import { AsyncDialogsProvider } from '../AsyncDialogs/AsyncDialogsProvider';
import { ClientVersionMismatchListener } from '../ClientVersion/ClientVersionMismatchListener';
import { ChatEnterBehaviorPreferencesProvider } from '../ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { Footer, type FooterLink } from '../Footer/Footer';
import { Header } from '../Header/Header';
import { MobileMenuHoistingProvider } from '../Header/MobileMenuHoistingContext';
import { MetadataFlagsProvider } from '../MetadataFlags/MetadataFlagsContext';
import { NotificationsProvider } from '../Notifications/NotificationsProvider';
import { PrivateModePreferencesProvider } from '../PrivateModePreferences/PrivateModePreferencesProvider';
import { BrowserPushNotificationsProvider } from '../PushNotifications/BrowserPushNotificationsProvider';
import { ServerLanguageProvider } from '../ServerLanguage/ServerLanguageProvider';
import { SelfLearningPreferencesProvider } from '../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { SoundSystemProvider } from '../SoundSystemProvider/SoundSystemProvider';
import { ViewportHeightController } from '../ViewportHeightController/ViewportHeightController';

type LayoutWrapperProps = {
    children: React.ReactNode;
    isAdmin: boolean;
    isGlobalAdmin: boolean;
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
    feedbackMode: ChatFeedbackMode;
    /**
     * Indicates if the install-as-app option should be shown in agent menus.
     */
    readonly isExperimentalPwaAppEnabled: boolean;
    defaultIsSoundsOn: boolean;
    defaultIsVibrationOn: boolean;
    defaultIsNotificationsOn: boolean;
    defaultServerLanguage: string;
    webPushPublicKey: string | null;
};

export function LayoutWrapper({
    children,
    isAdmin,
    isGlobalAdmin,
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
    feedbackMode,
    isExperimentalPwaAppEnabled,
    defaultIsSoundsOn,
    defaultIsVibrationOn,
    defaultIsNotificationsOn,
    defaultServerLanguage,
    webPushPublicKey,
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isHeadless = searchParams.has('headless');
    // const isAdminChatPage = pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isChatPage = pathname ? /^\/agents\/[^/]+\/chat(?:\/chatgpt-like)?$/.test(pathname) : false;
    const isTextareaPage = pathname ? /^\/agents\/[^/]+\/textarea$/.test(pathname) : false;
    const isMockedChatsViewerPage = pathname ? /^\/system\/utilities\/mocked-chats\/view$/.test(pathname) : false;
    const isHeaderHidden = isTextareaPage;
    const isFooterHiddenOnPage = pathname
        ? /^\/agents\/[^/]+\/(book|chat(?:\/chatgpt-like)?|book\+chat|textarea)$/.test(pathname) ||
          isMockedChatsViewerPage
        : false;

    const mainClassName = isChatPage ? 'agents-server-chat-main' : 'flex-1 pt-[60px]';
    const shouldRenderMinimalShell = isHeaderHidden || isHeadless;
    const minimalMainClassName = isChatPage ? 'agents-server-chat-main agents-server-chat-main-minimal' : 'pt-0';

    return (
        <ServerLanguageProvider defaultLanguage={defaultServerLanguage}>
            <AsyncDialogsProvider>
                <AgentNamingProvider naming={agentNaming}>
                    <PrivateModePreferencesProvider>
                        <SelfLearningPreferencesProvider>
                            <SoundSystemProvider
                                initialIsSoundsOn={defaultIsSoundsOn}
                                initialIsVibrationOn={defaultIsVibrationOn}
                            >
                                <NotificationsProvider>
                                    <BrowserPushNotificationsProvider
                                        defaultEnabled={defaultIsNotificationsOn}
                                        pushPublicKey={webPushPublicKey}
                                    >
                                        <ChatEnterBehaviorPreferencesProvider>
                                            <ClientVersionMismatchListener />
                                            <ViewportHeightController />
                                            <MenuHoistingProvider>
                                                <MobileMenuHoistingProvider>
                                                    <MetadataFlagsProvider value={{ isExperimentalPwaAppEnabled }}>
                                                        {shouldRenderMinimalShell ? (
                                                            <main className={minimalMainClassName}>{children}</main>
                                                        ) : (
                                                            <div className="agents-server-app-shell flex flex-col">
                                                                <Header
                                                                    isAdmin={isAdmin}
                                                                    isGlobalAdmin={isGlobalAdmin}
                                                                    currentUser={currentUser}
                                                                    serverName={serverName}
                                                                    serverLogoUrl={serverLogoUrl}
                                                                    agents={agents}
                                                                    agentFolders={agentFolders}
                                                                    federatedServers={federatedServers}
                                                                    isExperimental={isExperimental}
                                                                    feedbackMode={feedbackMode}
                                                                />
                                                                <main className={mainClassName}>{children}</main>
                                                                {isFooterShown && !isFooterHiddenOnPage && (
                                                                    <Footer extraLinks={footerLinks} />
                                                                )}
                                                            </div>
                                                        )}
                                                    </MetadataFlagsProvider>
                                                </MobileMenuHoistingProvider>
                                            </MenuHoistingProvider>
                                        </ChatEnterBehaviorPreferencesProvider>
                                    </BrowserPushNotificationsProvider>
                                </NotificationsProvider>
                            </SoundSystemProvider>
                        </SelfLearningPreferencesProvider>
                    </PrivateModePreferencesProvider>
                </AgentNamingProvider>
            </AsyncDialogsProvider>
        </ServerLanguageProvider>
    );
}
