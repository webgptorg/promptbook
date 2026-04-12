'use client';

import { logoutAction } from '@/src/app/actions';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { HamburgerMenu } from '../../../../../src/book-components/_common/HamburgerMenu/HamburgerMenu';
import { useMenuHoisting } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { just } from '../../../../../src/utils/organization/just';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import { useInstallPromptState, type AgentContextMenuRenamePayload } from '../AgentContextMenu/AgentContextMenu';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { QrCodeModal } from '../AgentProfile/QrCodeModal';
import { showLoginDialog } from '../AsyncDialogs/asyncDialogs';
import { ChangePasswordDialog } from '../ChangePasswordDialog/ChangePasswordDialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { buildDocumentationDropdownItems } from './buildDocumentationDropdownItems';
import { buildFederatedDropdownItems } from './buildFederatedDropdownItems';
import { buildHeaderMenuItems } from './buildHeaderMenuItems';
import { buildHeaderSystemMenuItems } from './buildHeaderSystemMenuItems';
import { HeaderControlPanelDropdown } from './ControlPanel/ControlPanel';
import { HeaderDesktopContextNavigation } from './HeaderDesktopContextNavigation';
import { HeaderDesktopTopMenuNavigation } from './HeaderDesktopTopMenuNavigation';
import { HeaderMobileDrawer } from './HeaderMobileDrawer';
import { HeaderSearchBox } from './HeaderSearchBox';
import { HeaderDesktopUserMenu } from './HeaderDesktopUserMenu';
import type { HeaderProps } from './HeaderTypes';
import { navigateAfterHeaderAgentRename } from './navigateAfterHeaderAgentRename';
import { useMobileMenuHoisting } from './MobileMenuHoistingContext';
import type { SubMenuItem } from './SubMenuItem';
import { useHeaderActiveAgent } from './useHeaderActiveAgent';
import { useHeaderAgentMenus } from './useHeaderAgentMenus';
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
    const {
        activeAgent,
        activeAgentAvatarUrl,
        activeAgentEmail,
        activeAgentFolderContext,
        activeAgentHref,
        activeAgentLabel,
        activeAgentMenuAgent,
        activeAgentNavigationId,
        activeAgentOrigin,
        activeAgentUrl,
        activeAgentView,
        activeAgentViewLabel,
        agentMenuTree: baseAgentMenuTree,
    } = useHeaderActiveAgent({
        agents,
        agentFolders,
        namingPlural: naming.plural,
        pathname,
        translate: t,
    });
    const currentUserDisplayName = currentUser?.username || t('common.admin');
    const currentUserAvatarLabel = currentUserDisplayName.slice(0, 1).toUpperCase();
    const currentUserProfileImageUrl = currentUser?.profileImageUrl?.trim() || null;
    const isCurrentUserAdmin = Boolean(currentUser?.isAdmin || isAdmin);

    /**
     * Updates the current route after a rename initiated from the header menu.
     *
     * @param payload - Rename payload from the agent menu.
     */
    const handleAgentRenamedFromHeader = useCallback(
        (payload: AgentContextMenuRenamePayload) => {
            navigateAfterHeaderAgentRename({
                activeAgentNavigationId,
                activeAgentPermanentId: activeAgent?.permanentId,
                nextAgentName: payload.agent.agentName,
                pathname,
                router,
                search: typeof window !== 'undefined' ? window.location.search : '',
            });
        },
        [activeAgent?.permanentId, activeAgentNavigationId, pathname, router],
    );
    const {
        activeAgentViewItems,
        agentMenuTree,
        createNewAgentLabel,
        handleCloseAgentQrCode,
        handleCreateAgent,
        hierarchyAgentMobileItems,
        isAgentQrCodeOpen,
        isPreparingDialog,
        newAgentDialog,
        viewAllAgentsLabel,
    } = useHeaderAgentMenus({
        activeAgent,
        activeAgentEmail,
        activeAgentFolderContext,
        activeAgentMenuAgent,
        activeAgentNavigationId,
        activeAgentUrl,
        agentMenuTree: baseAgentMenuTree,
        closeAgentViewDropdown,
        installPromptEvent,
        isAdmin,
        isInstalled,
        navigateToHref: fallbackNavigateToHref,
        namingPlural: naming.plural,
        namingSingular: naming.singular,
        onAgentRenamed: handleAgentRenamedFromHeader,
        onInstallApp: handleInstallApp,
        setIsAgentsOpen,
        setIsMenuOpen,
        translate: t,
    });

    const handleLogout = useCallback(async () => {
        await logoutAction();
    }, []);
    const handleDesktopLogin = useCallback(() => {
        void showLoginDialog().catch(() => undefined);
        setIsMenuOpen(false);
    }, [setIsMenuOpen]);
    const handleDesktopLogout = useCallback(() => {
        void handleLogout();
        setIsMenuOpen(false);
    }, [handleLogout, setIsMenuOpen]);
    const handleMobileLogin = useCallback(() => {
        void showLoginDialog().catch(() => undefined);
        closeMobileMenu();
    }, [closeMobileMenu]);
    const handleMobileLogout = useCallback(() => {
        void handleLogout();
        closeMobileMenu();
    }, [closeMobileMenu, handleLogout]);
    const handleOpenDesktopChangePassword = useCallback(() => {
        setIsChangePasswordOpen(true);
    }, []);
    const handleOpenMobileChangePassword = useCallback(() => {
        setIsChangePasswordOpen(true);
        closeMobileMenu();
    }, [closeMobileMenu]);
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
                            onLogin={handleDesktopLogin}
                            onLogout={handleDesktopLogout}
                            onOpenChangePassword={handleOpenDesktopChangePassword}
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
                    onLogin={handleMobileLogin}
                    onLogout={handleMobileLogout}
                    onOpenChangePassword={handleOpenMobileChangePassword}
                    renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                />
            </div>
            {newAgentDialog}
        </header>
    );
}
