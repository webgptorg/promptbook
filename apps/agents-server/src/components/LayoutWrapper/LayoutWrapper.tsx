'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { MenuHoistingProvider } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import type { AgentNaming } from '../../utils/agentNaming';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { ChatFeedbackMode } from '../../utils/chatFeedbackMode';
import type { UserInfo } from '../../utils/getCurrentUser';
import { AgentNamingProvider } from '../AgentNaming/AgentNamingContext';
import { LegacyUiAutoTranslator } from '../AgentNaming/LegacyUiAutoTranslator';
import { AsyncDialogsProvider } from '../AsyncDialogs/AsyncDialogsProvider';
import { ChatVisualModeProvider } from '../ChatVisualMode/ChatVisualModeProvider';
import { ClientVersionMismatchListener } from '../ClientVersion/ClientVersionMismatchListener';
import { ChatEnterBehaviorPreferencesProvider } from '../ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { Footer, type FooterLink } from '../Footer/Footer';
import { Header } from '../Header/Header';
import { MobileMenuHoistingProvider } from '../Header/MobileMenuHoistingContext';
import { MetadataFlagsProvider } from '../MetadataFlags/MetadataFlagsContext';
import { NavigationProgressBar } from '../NavigationProgress/NavigationProgressBar';
import { NotificationsProvider } from '../Notifications/NotificationsProvider';
import { PrivateModePreferencesProvider } from '../PrivateModePreferences/PrivateModePreferencesProvider';
import { BrowserPushNotificationsProvider } from '../PushNotifications/BrowserPushNotificationsProvider';
import { ServerLanguageProvider } from '../ServerLanguage/ServerLanguageProvider';
import { SelfLearningPreferencesProvider } from '../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { SoundSystemProvider } from '../SoundSystemProvider/SoundSystemProvider';
import { ThemeModeProvider } from '../ThemeMode/ThemeModeProvider';
import { ViewportHeightController } from '../ViewportHeightController/ViewportHeightController';
import type { ControlPanelOptionAvailability } from '../../utils/getControlPanelOptionAvailability';

/**
 * Props for layout wrapper.
 */
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
    /**
     * Server-specific visibility of each control-panel option.
     */
    readonly controlPanelOptionAvailability: ControlPanelOptionAvailability;
    defaultIsSoundsOn: boolean;
    defaultIsVibrationOn: boolean;
    defaultIsNotificationsOn: boolean;
    defaultServerLanguage: string;
    /**
     * Controls whether user-level language overrides are disabled.
     */
    isServerLanguageEnforced: boolean;
    defaultThemeMode: string;
    defaultChatVisualMode: string;
    webPushPublicKey: string | null;
};

/**
 * Handles layout wrapper.
 */
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
    controlPanelOptionAvailability,
    defaultIsSoundsOn,
    defaultIsVibrationOn,
    defaultIsNotificationsOn,
    defaultServerLanguage,
    isServerLanguageEnforced,
    defaultThemeMode,
    defaultChatVisualMode,
    webPushPublicKey,
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isHeadless = searchParams?.has('headless') ?? false;
    // const isAdminChatPage = pathname?.startsWith('/admin/chat-history') || pathname?.startsWith('/admin/chat-feedback');
    const isChatPage = pathname ? /^\/agents\/[^/]+\/chat$/.test(pathname) : false;
    const isTextareaPage = pathname ? /^\/agents\/[^/]+\/textarea$/.test(pathname) : false;
    const isMockedChatsViewerPage = pathname ? /^\/system\/utilities\/mocked-chats\/view$/.test(pathname) : false;
    const isHeaderHidden = isTextareaPage;
    const isFooterHiddenOnPage = pathname
        ? /^\/agents\/[^/]+\/(book|chat|book\+chat|textarea)$/.test(pathname) || isMockedChatsViewerPage
        : false;

    const mainClassName = isChatPage ? 'agents-server-chat-main' : 'flex-1 pt-[60px]';
    const shouldRenderMinimalShell = isHeaderHidden || isHeadless;
    const minimalMainClassName = isChatPage ? 'agents-server-chat-main agents-server-chat-main-minimal' : 'pt-0';

    return (
        <ServerLanguageProvider
            defaultLanguage={defaultServerLanguage}
            isServerLanguageEnforced={isServerLanguageEnforced}
        >
            <ThemeModeProvider defaultThemeMode={defaultThemeMode}>
                <ChatVisualModeProvider defaultChatVisualMode={defaultChatVisualMode}>
                    <AsyncDialogsProvider>
                        <AgentNamingProvider naming={agentNaming}>
                            <LegacyUiAutoTranslator />
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
                                                isMetadataAvailable={controlPanelOptionAvailability.notifications}
                                            >
                                                <ChatEnterBehaviorPreferencesProvider>
                                                    <ClientVersionMismatchListener />
                                                    <ViewportHeightController />
                                                    <NavigationProgressBar />
                                                    <MenuHoistingProvider>
                                                        <MobileMenuHoistingProvider>
                                                            <MetadataFlagsProvider
                                                                value={{
                                                                    isExperimentalPwaAppEnabled,
                                                                    controlPanelOptionAvailability,
                                                                }}
                                                            >
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
                </ChatVisualModeProvider>
            </ThemeModeProvider>
        </ServerLanguageProvider>
    );
}
