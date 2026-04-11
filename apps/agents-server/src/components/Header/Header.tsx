'use client';

import { logoutAction } from '@/src/app/actions';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { HamburgerMenu } from '../../../../../src/book-components/_common/HamburgerMenu/HamburgerMenu';
import { useMenuHoisting } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { just } from '../../../../../src/utils/organization/just';
import { buildAgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import {
    useAgentContextMenuItems,
    useInstallPromptState,
    type AgentContextMenuRenamePayload,
} from '../AgentContextMenu/AgentContextMenu';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { QrCodeModal } from '../AgentProfile/QrCodeModal';
import { showAlert, showLoginDialog } from '../AsyncDialogs/asyncDialogs';
import { ChangePasswordDialog } from '../ChangePasswordDialog/ChangePasswordDialog';
import { useNewAgentDialog } from '../NewAgentDialog/useNewAgentDialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import type { HeaderAgentMenuFolder } from './AgentMenuStructure';
import { appendFolderActionNodes } from './appendFolderActionNodes';
import { buildActiveAgentViewItems } from './buildActiveAgentViewItems';
import { buildAgentMenuStructure } from './buildAgentMenuStructure';
import { buildDocumentationDropdownItems } from './buildDocumentationDropdownItems';
import { buildFederatedDropdownItems } from './buildFederatedDropdownItems';
import { buildHeaderMenuItems } from './buildHeaderMenuItems';
import { buildHeaderSystemMenuItems } from './buildHeaderSystemMenuItems';
import { HeaderControlPanelDropdown } from './ControlPanel/ControlPanel';
import { createAgentHierarchyMobileItems } from './createAgentHierarchyMobileItems';
import { createAgentViewLabel } from './createAgentViewLabel';
import { HeaderDesktopContextNavigation } from './HeaderDesktopContextNavigation';
import { HeaderDesktopTopMenuNavigation } from './HeaderDesktopTopMenuNavigation';
import { HeaderMobileDrawer } from './HeaderMobileDrawer';
import { HeaderSearchBox } from './HeaderSearchBox';
import { HeaderDesktopUserMenu } from './HeaderDesktopUserMenu';
import type { HeaderProps } from './HeaderTypes';
import { mapContextMenuItemsToSubMenuItems } from './mapContextMenuItemsToSubMenuItems';
import { useMobileMenuHoisting } from './MobileMenuHoistingContext';
import {
    createAgentHierarchyLabel,
    createFallbackAgent,
    getAgentNavigationId,
    resolveActiveAgentNavigation,
} from './resolveActiveAgentNavigation';
import { resolveRenamedHeaderPath } from './resolveRenamedHeaderPath';
import type { SubMenuItem } from './SubMenuItem';
import { useHeaderDropdownState } from './useHeaderDropdownState';

/* TODO: [🐱‍🚀] Make this Agents server native  */

/**
 * Shared immutable fallback for mobile drawer sections when no route-level entries are hoisted.
 */
const EMPTY_HOISTED_MOBILE_MENU_ITEMS: ReadonlyArray<SubMenuItem> = [];

/**
 * Handles header.
 */
export function Header(props: HeaderProps) {
    const {
        isAdmin = false,
        isGlobalAdmin = false,
        currentUser = null,
        serverName,
        serverLogoUrl,
        agents,
        agentFolders,
        federatedServers,
        isExperimental = false,
        feedbackMode = 'stars',
    } = props;

    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isAgentQrCodeOpen, setIsAgentQrCodeOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const isHeadless = useIsHeadless();
    const menuHoisting = useMenuHoisting();
    const mobileMenuHoisting = useMobileMenuHoisting();
    const { naming } = useAgentNaming();
    const { t } = useServerLanguage();
    const { installPromptEvent, isInstalled, handleInstallApp } = useInstallPromptState();
    const visibleDocumentationCommitments = useMemo(() => getVisibleCommitmentDefinitions(), []);
    const documentationDropdownItems = useMemo(
        () => buildDocumentationDropdownItems(visibleDocumentationCommitments, t),
        [t, visibleDocumentationCommitments],
    );

    const fallbackNavigateToHref = useCallback(
        (href: string) => {
            pushWithHeadless(router, href, isHeadless);
        },
        [isHeadless, router],
    );
    const hoistedMobileMenuItems = mobileMenuHoisting?.menuItems || EMPTY_HOISTED_MOBILE_MENU_ITEMS;
    const {
        cancelMenuClose,
        closeAgentViewDesktopDropdown,
        closeAgentViewDropdown,
        closeAgentsDropdown,
        closeDesktopDropdownNow,
        closeFederatedDesktopDropdown,
        closeMobileMenu,
        closeProfileDesktopDropdown,
        headerRef,
        isAgentViewDesktopPointerEnabled,
        isAgentViewOpen,
        isAgentsDesktopPointerEnabled,
        isAgentsOpen,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        isDocsOpen,
        isFederatedDesktopPointerEnabled,
        isFederatedOpen,
        isMenuOpen,
        isMobileAgentViewOpen,
        isMobileAgentsOpen,
        isMobileDocsOpen,
        isMobileSystemOpen,
        isProfileDesktopPointerEnabled,
        isProfileOpen,
        isSystemOpen,
        isTouchInput,
        mobileMenuDrawerRef,
        openInteractiveDesktopDropdown,
        renderDesktopDropdownItems,
        renderMobileNestedMenuItems,
        scheduleMenuClose,
        setIsAgentViewOpen,
        setIsAgentsOpen,
        setIsDocsOpen,
        setIsFederatedOpen,
        setIsMenuOpen,
        setIsMobileAgentViewOpen,
        setIsMobileAgentsOpen,
        setIsMobileDocsOpen,
        setIsMobileSystemOpen,
        setIsProfileOpen,
        setIsSystemOpen,
        startDesktopDropdownPreview,
        toggleAgentViewDesktopDropdown,
        toggleAgentsDesktopDropdown,
        toggleFederatedDesktopDropdown,
        toggleProfileDesktopDropdown,
    } = useHeaderDropdownState({
        fallbackNavigateToHref,
        hasHoistedMobileMenuItems: hoistedMobileMenuItems.length > 0,
        isHeadless,
    });

    const agentMenuStructure = useMemo(() => buildAgentMenuStructure(agents, agentFolders), [agents, agentFolders]);
    const agentFolderById = useMemo(
        () => new Map(agentFolders.map((folder) => [folder.id, folder as HeaderAgentMenuFolder])),
        [agentFolders],
    );
    const agentByIdentifier = useMemo(() => {
        const map = new Map<string, AgentOrganizationAgent>();
        for (const agent of agents) {
            map.set(agent.agentName, agent);
            if (agent.permanentId) {
                map.set(agent.permanentId, agent);
            }
        }
        return map;
    }, [agents]);
    const activeAgentNavigation = useMemo(() => resolveActiveAgentNavigation(pathname), [pathname]);
    const activeAgent = useMemo(() => {
        if (!activeAgentNavigation.agentIdentifier) {
            return null;
        }
        return agentByIdentifier.get(activeAgentNavigation.agentIdentifier) || null;
    }, [activeAgentNavigation.agentIdentifier, agentByIdentifier]);
    const activeAgentIdentifier = activeAgentNavigation.agentIdentifier;
    const activeAgentNavigationId = activeAgent ? getAgentNavigationId(activeAgent) : activeAgentIdentifier || null;
    const activeAgentHref = activeAgentNavigationId
        ? `/agents/${encodeURIComponent(activeAgentNavigationId)}`
        : '/agents';
    const activeAgentLabel = activeAgent
        ? createAgentHierarchyLabel(activeAgent, agentFolderById)
        : activeAgentIdentifier || t('header.agentsLabelFallback', { agentsPlural: naming.plural });
    const activeAgentView = activeAgentNavigation.view;
    const activeAgentViewLabel = activeAgentView ? createAgentViewLabel(activeAgentView, t) : null;
    const activeAgentFallback = useMemo(() => createFallbackAgent(activeAgentNavigationId), [activeAgentNavigationId]);
    const activeAgentMenuAgent = activeAgent || activeAgentFallback;
    const activeAgentFolderContext = useMemo(
        () => buildAgentFolderContext(activeAgentMenuAgent.folderId, agentFolderById),
        [activeAgentMenuAgent.folderId, agentFolderById],
    );
    const activeAgentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const activeAgentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const activeAgentUrl = activeAgentNavigationId ? `${activeAgentOrigin}${activeAgentHref}` : '';
    const activeAgentEmail =
        activeAgentNavigationId && activeAgentHostname ? `${activeAgentNavigationId}@${activeAgentHostname}` : '';
    const activeAgentAvatarUrl = useMemo(() => {
        if (!activeAgent) {
            return null;
        }

        return resolveAgentAvatarImageUrl({ agent: activeAgent });
    }, [activeAgent]);
    const currentUserDisplayName = currentUser?.username || t('common.admin');
    const currentUserAvatarLabel = currentUserDisplayName.slice(0, 1).toUpperCase();
    const currentUserProfileImageUrl = currentUser?.profileImageUrl?.trim() || null;
    const isCurrentUserAdmin = Boolean(currentUser?.isAdmin || isAdmin);
    /**
     * Opens the active agent QR code modal.
     */
    const handleShowAgentQrCode = useCallback(() => {
        setIsAgentQrCodeOpen(true);
    }, []);

    /**
     * Closes the active agent QR code modal.
     */
    const handleCloseAgentQrCode = useCallback(() => {
        setIsAgentQrCodeOpen(false);
    }, []);

    /**
     * Updates the current route after a rename initiated from the header menu.
     *
     * @param payload - Rename payload from the agent menu.
     */
    const handleAgentRenamedFromHeader = useCallback(
        (payload: AgentContextMenuRenamePayload) => {
            const nextAgentName = payload.agent.agentName;
            if (!nextAgentName) {
                return;
            }

            const usesPermanentId =
                Boolean(activeAgent?.permanentId) && activeAgentNavigationId === activeAgent?.permanentId;

            if (usesPermanentId) {
                router.refresh();
                return;
            }

            if (!pathname) {
                router.refresh();
                return;
            }

            const nextPath = resolveRenamedHeaderPath(pathname, nextAgentName);
            if (!nextPath) {
                router.refresh();
                return;
            }

            const search = typeof window !== 'undefined' ? window.location.search : '';
            router.replace(`${nextPath}${search}`);
        },
        [activeAgent?.permanentId, activeAgentNavigationId, pathname, router],
    );

    const agentContextMenuItems = useAgentContextMenuItems({
        agent: activeAgentMenuAgent,
        agentName: activeAgentNavigationId || activeAgentMenuAgent.agentName,
        derivedAgentName: activeAgent?.agentName || activeAgentNavigationId || activeAgentMenuAgent.agentName,
        permanentId: activeAgent?.permanentId,
        agentUrl: activeAgentUrl,
        agentEmail: activeAgentEmail,
        folderContext: activeAgentFolderContext,
        isAdmin,
        onShowQrCode: handleShowAgentQrCode,
        onAgentRenamed: handleAgentRenamedFromHeader,
        onRequestClose: closeAgentViewDropdown,
        installPromptEvent,
        isInstalled,
        onInstallApp: handleInstallApp,
    });
    const agentMoreViewItems = useMemo(
        () => mapContextMenuItemsToSubMenuItems(agentContextMenuItems),
        [agentContextMenuItems],
    );
    const activeAgentViewItems = useMemo(
        () =>
            buildActiveAgentViewItems({
                activeAgentNavigationId,
                agentMoreViewItems,
                isAdmin,
                translate: t,
            }),
        [activeAgentNavigationId, agentMoreViewItems, isAdmin, t],
    );

    const handleLogout = async () => {
        await logoutAction();
    };

    /**
     * Shows the shared "new agent" failure dialog while preserving the original log context.
     */
    const handleNewAgentFailure = useCallback(
        async (logMessage: string, error: unknown) => {
            console.error(logMessage, error);
            await showAlert({
                title: t('header.createFailedTitle', { agentSingular: naming.singular }),
                message:
                    error instanceof Error
                        ? error.message
                        : t('header.createFailedMessage', { agentSingular: naming.singular }),
            }).catch(() => undefined);
        },
        [naming.singular, t],
    );

    const {
        isPreparingDialog,
        openNewAgentDialog,
        dialog: newAgentDialog,
    } = useNewAgentDialog({
        onCreated: ({ targetPath }) => {
            pushWithHeadless(router, targetPath, isHeadless);
        },
        onCreateFailed: async (error) => {
            await handleNewAgentFailure('Failed to create agent:', error);
        },
        onPrepareFailed: async (error) => {
            await handleNewAgentFailure('Failed to generate agent boilerplate:', error);
        },
    });

    const createNewAgentLabel = useMemo(
        () =>
            isPreparingDialog ? (
                <div className="flex items-center">
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    {t('header.creatingAgent', { agentSingular: naming.singular })}
                </div>
            ) : (
                t('header.createNewAgent', { agentSingular: naming.singular })
            ),
        [isPreparingDialog, naming.singular, t],
    );
    const createNewAgentText = t('header.createNewAgent', { agentSingular: naming.singular });
    const viewAllAgentsLabel = t('header.viewAllAgents', { agentsPlural: naming.plural });

    const handleCreateAgent = useCallback(
        (folderId: number | null) => {
            void openNewAgentDialog({ folderId });
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        },
        [openNewAgentDialog, setIsAgentsOpen, setIsMenuOpen],
    );

    const agentMenuTree = useMemo(
        () =>
            appendFolderActionNodes(agentMenuStructure.tree, {
                viewAllLabel: viewAllAgentsLabel,
                createLabel: createNewAgentText,
                renderCreateLabel: createNewAgentLabel,
                onCreateInFolder: isPreparingDialog ? undefined : (folderId) => handleCreateAgent(folderId),
            }),
        [
            agentMenuStructure.tree,
            viewAllAgentsLabel,
            createNewAgentText,
            createNewAgentLabel,
            isPreparingDialog,
            handleCreateAgent,
        ],
    );

    /**
     * Static entries appended below the dynamic hierarchy in the Agents menu.
     */
    const hierarchyAgentActionItems: SubMenuItem[] = [
        {
            label: viewAllAgentsLabel,
            href: '/agents',
            isBold: true,
            isBordered: true,
        },
        {
            label: createNewAgentLabel,
            onClick: isPreparingDialog ? undefined : () => handleCreateAgent(null),
            isBold: true,
        },
    ];
    /**
     * Hierarchical mobile Agents menu data with appended action items.
     */
    const hierarchyAgentMobileItems: SubMenuItem[] = [
        ...createAgentHierarchyMobileItems(agentMenuTree),
        ...hierarchyAgentActionItems,
    ];
    const federatedDropdownItems = useMemo(
        () =>
            buildFederatedDropdownItems({
                currentFederatedServerLabel: t('header.currentFederatedServer'),
                currentOrigin: activeAgentOrigin,
                federatedServers,
                serverLogoUrl,
            }),
        [activeAgentOrigin, federatedServers, serverLogoUrl, t],
    );

    const hasMenuAccess = Boolean(currentUser || isAdmin);
    const systemMenuEntries = useMemo(
        () =>
            buildHeaderSystemMenuItems({
                translate: t,
                currentUser,
                isAdmin,
                isGlobalAdmin,
                isExperimental,
                feedbackMode,
            }),
        [currentUser, feedbackMode, isAdmin, isExperimental, isGlobalAdmin, t],
    );
    const menuItems = useMemo(
        () =>
            buildHeaderMenuItems({
                documentationDropdownItems,
                documentationLabel: t('header.documentationMenuLabel'),
                hasMenuAccess,
                isDocsOpen,
                isMobileDocsOpen,
                isMobileSystemOpen,
                isSystemOpen,
                setIsDocsOpen,
                setIsMobileDocsOpen,
                setIsMobileSystemOpen,
                setIsSystemOpen,
                systemLabel: t('header.systemMenuLabel'),
                systemMenuEntries,
            }),
        [
            documentationDropdownItems,
            hasMenuAccess,
            isDocsOpen,
            isMobileDocsOpen,
            isMobileSystemOpen,
            isSystemOpen,
            setIsDocsOpen,
            setIsMobileDocsOpen,
            setIsMobileSystemOpen,
            setIsSystemOpen,
            systemMenuEntries,
            t,
        ],
    );

    return (
        <header
            ref={headerRef}
            className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16"
        >
            {isChangePasswordOpen && <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} />}
            {isAgentQrCodeOpen && activeAgent && (
                <QrCodeModal
                    onClose={handleCloseAgentQrCode}
                    agentName={activeAgentNavigationId || activeAgent.agentName}
                    meta={activeAgent.meta}
                    personaDescription={activeAgent.personaDescription || ''}
                    agentUrl={activeAgentUrl}
                    agentEmail={activeAgentEmail}
                    brandColorHex={activeAgent.meta.color || PROMPTBOOK_COLOR.toHex()}
                />
            )}
            <div className="relative h-full w-full">
                <div className="flex h-full items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5 lg:px-4">
                    <div className="relative z-[90] -ml-1 shrink-0 lg:hidden">
                        <HamburgerMenu
                            isOpen={isMenuOpen}
                            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                            className="text-gray-600 transition-colors duration-150 hover:text-gray-900"
                        />
                    </div>
                    <HeaderDesktopContextNavigation
                        activeAgent={activeAgent}
                        activeAgentAvatarUrl={activeAgentAvatarUrl}
                        activeAgentHref={activeAgentHref}
                        activeAgentLabel={activeAgentLabel}
                        activeAgentView={activeAgentView}
                        activeAgentViewButtonLabel={activeAgentViewLabel}
                        activeAgentViewItems={activeAgentViewItems}
                        agentMenuTree={agentMenuTree}
                        cancelMenuClose={cancelMenuClose}
                        closeAgentViewDesktopDropdown={closeAgentViewDesktopDropdown}
                        closeAgentsDropdown={closeAgentsDropdown}
                        closeFederatedDesktopDropdown={closeFederatedDesktopDropdown}
                        createNewAgentLabel={createNewAgentLabel}
                        federatedDropdownItems={federatedDropdownItems}
                        hasFederatedServers={federatedServers.length > 0}
                        isAdmin={isAdmin}
                        isAgentViewDesktopPointerEnabled={isAgentViewDesktopPointerEnabled}
                        isAgentViewOpen={isAgentViewOpen}
                        isAgentsDesktopPointerEnabled={isAgentsDesktopPointerEnabled}
                        isAgentsOpen={isAgentsOpen}
                        isFederatedDesktopPointerEnabled={isFederatedDesktopPointerEnabled}
                        isFederatedOpen={isFederatedOpen}
                        isTouchInput={isTouchInput}
                        onCreateAgent={isPreparingDialog ? undefined : () => handleCreateAgent(null)}
                        renderDesktopDropdownItems={renderDesktopDropdownItems}
                        scheduleMenuClose={scheduleMenuClose}
                        serverName={serverName}
                        serverLogoUrl={serverLogoUrl}
                        setIsAgentViewOpen={setIsAgentViewOpen}
                        setIsAgentsOpen={setIsAgentsOpen}
                        setIsFederatedOpen={setIsFederatedOpen}
                        startDesktopDropdownPreview={startDesktopDropdownPreview}
                        switchServerAriaLabel={t('header.switchServerAria')}
                        toggleAgentViewDesktopDropdown={toggleAgentViewDesktopDropdown}
                        toggleAgentsDesktopDropdown={toggleAgentsDesktopDropdown}
                        toggleFederatedDesktopDropdown={toggleFederatedDesktopDropdown}
                        viewAllAgentsLabel={viewAllAgentsLabel}
                    />

                    <div className="hidden items-center justify-center px-2 lg:flex xl:px-4">
                        <div className="hidden w-[clamp(12rem,20vw,22.5rem)] xl:block">
                            <HeaderSearchBox className="w-full" />
                        </div>
                    </div>

                    {/* CTA Button & Mobile Menu Toggle */}
                    <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 lg:ml-0 lg:justify-self-end">
                        <HeaderDesktopTopMenuNavigation
                            items={menuItems}
                            isDesktopDropdownInteractive={isDesktopDropdownInteractive}
                            openInteractiveDesktopDropdown={openInteractiveDesktopDropdown}
                            closeDesktopDropdownNow={closeDesktopDropdownNow}
                            startDesktopDropdownPreview={startDesktopDropdownPreview}
                            scheduleMenuClose={scheduleMenuClose}
                            cancelMenuClose={cancelMenuClose}
                            isDesktopDropdownPointerEnabled={isDesktopDropdownPointerEnabled}
                            renderDesktopDropdownItems={renderDesktopDropdownItems}
                        />
                        {menuHoisting && menuHoisting.menu.length > 0 && (
                            <div className="hidden lg:flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
                                {menuHoisting.menu.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={item.onClick}
                                        className={`p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 ${
                                            item.isActive ? 'bg-gray-100 text-gray-900' : ''
                                        }`}
                                        title={item.name}
                                    >
                                        {item.icon}
                                    </button>
                                ))}
                            </div>
                        )}
                        <HeaderControlPanelDropdown />
                        {just(false /* TODO: [🧠] Figure out what to do with call to action */) && (
                            <a href="https://ptbk.io/?modal=get-started" target="_blank" className="hidden md:block">
                                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90">
                                    Get Started
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </a>
                        )}

                        <HeaderDesktopUserMenu
                            adminLabel={t('common.admin')}
                            cancelMenuClose={cancelMenuClose}
                            changePasswordLabel={t('header.changePassword')}
                            closeProfileDesktopDropdown={closeProfileDesktopDropdown}
                            currentUser={currentUser}
                            currentUserAvatarLabel={currentUserAvatarLabel}
                            currentUserDisplayName={currentUserDisplayName}
                            currentUserProfileImageUrl={currentUserProfileImageUrl}
                            isAdmin={isAdmin}
                            isProfileDesktopPointerEnabled={isProfileDesktopPointerEnabled}
                            isProfileOpen={isProfileOpen}
                            logInLabel={t('header.logIn')}
                            logOutLabel={t('header.logOut')}
                            onLogin={() => {
                                void showLoginDialog().catch(() => undefined);
                                setIsMenuOpen(false);
                            }}
                            onLogout={() => {
                                void handleLogout();
                                setIsMenuOpen(false);
                            }}
                            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                            scheduleMenuClose={scheduleMenuClose}
                            setIsProfileOpen={setIsProfileOpen}
                            startDesktopDropdownPreview={startDesktopDropdownPreview}
                            toggleProfileDesktopDropdown={toggleProfileDesktopDropdown}
                        />
                    </div>
                </div>

                <HeaderMobileDrawer
                    isOpen={isMenuOpen}
                    mobileMenuDrawerRef={mobileMenuDrawerRef}
                    serverName={serverName}
                    isAdmin={isAdmin}
                    activeAgent={activeAgent}
                    activeAgentLabel={activeAgentLabel}
                    activeAgentAvatarUrl={activeAgentAvatarUrl}
                    activeAgentHref={activeAgentHref}
                    activeAgentView={activeAgentView}
                    activeAgentViewLabel={activeAgentViewLabel}
                    activeAgentViewItems={activeAgentViewItems}
                    isMobileAgentsOpen={isMobileAgentsOpen}
                    setIsMobileAgentsOpen={setIsMobileAgentsOpen}
                    isMobileAgentViewOpen={isMobileAgentViewOpen}
                    setIsMobileAgentViewOpen={setIsMobileAgentViewOpen}
                    federatedServers={federatedServers}
                    federatedDropdownItems={federatedDropdownItems}
                    isFederatedOpen={isFederatedOpen}
                    setIsFederatedOpen={setIsFederatedOpen}
                    hoistedMobileMenuItems={hoistedMobileMenuItems}
                    hierarchyAgentMobileItems={hierarchyAgentMobileItems}
                    menuHoistingItems={menuHoisting?.menu || []}
                    currentUser={currentUser}
                    currentUserDisplayName={currentUserDisplayName}
                    currentUserProfileImageUrl={currentUserProfileImageUrl}
                    currentUserAvatarLabel={currentUserAvatarLabel}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    menuItems={menuItems}
                    translate={t}
                    closeMenu={closeMobileMenu}
                    onLogin={() => {
                        void showLoginDialog().catch(() => undefined);
                        closeMobileMenu();
                    }}
                    onLogout={() => {
                        void handleLogout();
                        closeMobileMenu();
                    }}
                    onOpenChangePassword={() => {
                        setIsChangePasswordOpen(true);
                        closeMobileMenu();
                    }}
                    renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                />
            </div>
            {newAgentDialog}
        </header>
    );
}
