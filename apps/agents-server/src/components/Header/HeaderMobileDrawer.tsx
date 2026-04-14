'use client';

import { ChevronDown, FolderIcon, Lock, LogIn, LogOut } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import type { HoistedMenuItem } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { ArrowIcon } from '../../../../../src/book-components/icons/ArrowIcon';
import { just } from '../../../../../src/utils/organization/just';
import { AgentNameWithAvatar } from './AgentNameWithAvatar';
import type { AgentHierarchyView } from './createAgentViewLabel';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { HeadlessLink } from '../_utils/headlessParam';
import { HeaderSearchBox } from './HeaderSearchBox';
import type { MenuItem } from './HeaderTypes';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Shared style for top-level interactive rows in the mobile drawer.
 */
const MOBILE_DRAWER_TOP_LEVEL_BUTTON_CLASSNAME =
    'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100';

/**
 * Shared compact panel surface used by collapsible mobile drawer sections.
 */
const MOBILE_DRAWER_PANEL_CLASSNAME =
    'w-full flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50/80 p-2.5 shadow-sm';

/**
 * Translation function shape used by the mobile drawer component.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderTranslate = (key: ServerTranslationKey, variables?: Record<string, string>) => string;

/**
 * Shared nested-menu renderer signature injected from the header dropdown state.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerNestedMenuRenderer = (
    items: ReadonlyArray<SubMenuItem>,
    keyPrefix: string,
    depth?: number,
) => ReactNode;

/**
 * Props for the extracted mobile header drawer.
 *
 * @private type of Header
 */
type HeaderMobileDrawerProps = {
    readonly isOpen: boolean;
    readonly mobileMenuDrawerRef: RefObject<HTMLDivElement | null>;
    readonly serverName: string;
    readonly isAdmin: boolean;
    readonly activeAgent: unknown;
    readonly activeAgentLabel: string;
    readonly activeAgentAvatarUrl: string | null;
    readonly activeAgentHref: string;
    readonly activeAgentView: AgentHierarchyView | null;
    readonly activeAgentViewLabel: ReactNode;
    readonly activeAgentViewItems: ReadonlyArray<SubMenuItem>;
    readonly isMobileAgentsOpen: boolean;
    readonly setIsMobileAgentsOpen: (isOpen: boolean) => void;
    readonly isMobileAgentViewOpen: boolean;
    readonly setIsMobileAgentViewOpen: (isOpen: boolean) => void;
    readonly federatedServers: ReadonlyArray<{ url: string; title: string; logoUrl?: string | null }>;
    readonly federatedDropdownItems: ReadonlyArray<SubMenuItem>;
    readonly isFederatedOpen: boolean;
    readonly setIsFederatedOpen: (isOpen: boolean) => void;
    readonly hoistedMobileMenuItems: ReadonlyArray<SubMenuItem>;
    readonly hierarchyAgentMobileItems: ReadonlyArray<SubMenuItem>;
    readonly menuHoistingItems: ReadonlyArray<HoistedMenuItem>;
    readonly currentUser: unknown;
    readonly currentUserDisplayName: string;
    readonly currentUserProfileImageUrl: string | null;
    readonly currentUserAvatarLabel: string;
    readonly isCurrentUserAdmin: boolean;
    readonly menuItems: ReadonlyArray<MenuItem>;
    readonly translate: HeaderTranslate;
    readonly closeMenu: () => void;
    readonly onLogin: () => void;
    readonly onLogout: () => void;
    readonly onOpenChangePassword: () => void;
    readonly renderMobileNestedMenuItems: HeaderMobileDrawerNestedMenuRenderer;
};

/**
 * Props for the shared mobile drawer panel wrapper.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerPanelProps = {
    readonly children: ReactNode;
    readonly className?: string;
};

/**
 * Renders the shared rounded panel surface used by collapsible drawer sections.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerPanel({ children, className = '' }: HeaderMobileDrawerPanelProps) {
    return <div className={`${MOBILE_DRAWER_PANEL_CLASSNAME} ${className}`.trim()}>{children}</div>;
}

/**
 * Creates the shared rotation class for drawer chevron indicators.
 *
 * @private function of HeaderMobileDrawer
 */
function createHeaderMobileDrawerChevronClassName(isOpen: boolean): string {
    return `h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`;
}

/**
 * Props for the route-level hoisted menu section near the top of the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerHoistedMenuSectionProps = Pick<
    HeaderMobileDrawerProps,
    'hoistedMobileMenuItems' | 'renderMobileNestedMenuItems'
>;

/**
 * Renders the hoisted route-level menu entries when the current page contributes any.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerHoistedMenuSection({
    hoistedMobileMenuItems,
    renderMobileNestedMenuItems,
}: HeaderMobileDrawerHoistedMenuSectionProps) {
    if (hoistedMobileMenuItems.length === 0) {
        return null;
    }

    return (
        <div className="w-full border-b border-gray-200 pb-4">
            {renderMobileNestedMenuItems(hoistedMobileMenuItems, 'mobile-hoisted-menu')}
        </div>
    );
}

/**
 * Props for one federated-server item rendered inside the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerFederatedItemProps = {
    readonly closeMenu: () => void;
    readonly subItem: SubMenuItem;
};

/**
 * Renders one federated-server switch entry as a link or static label.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerFederatedItem({
    closeMenu,
    subItem,
}: HeaderMobileDrawerFederatedItemProps) {
    const className = `block rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-white hover:text-gray-900 active:bg-gray-100 ${
        subItem.isBold ? 'font-semibold' : ''
    }`;

    if (subItem.href) {
        return (
            <HeadlessLink href={subItem.href} className={className} onClick={closeMenu}>
                {subItem.label}
            </HeadlessLink>
        );
    }

    return (
        <span className={className}>
            {subItem.label}
        </span>
    );
}

/**
 * Props for the federated-server switcher inside the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerFederatedMenuProps = Pick<
    HeaderMobileDrawerProps,
    'closeMenu' | 'federatedDropdownItems' | 'isFederatedOpen'
>;

/**
 * Renders the expanded federated-server menu when the switcher is open.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerFederatedMenu({
    closeMenu,
    federatedDropdownItems,
    isFederatedOpen,
}: HeaderMobileDrawerFederatedMenuProps) {
    if (!isFederatedOpen || federatedDropdownItems.length === 0) {
        return null;
    }

    return (
        <HeaderMobileDrawerPanel className="mt-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {federatedDropdownItems.map((subItem, subIndex) => (
                <HeaderMobileDrawerFederatedItem
                    key={`mobile-federated-${subIndex}`}
                    closeMenu={closeMenu}
                    subItem={subItem}
                />
            ))}
        </HeaderMobileDrawerPanel>
    );
}

/**
 * Props for the shared active-agent identity label shown in the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerActiveAgentIdentityProps = Pick<
    HeaderMobileDrawerProps,
    'activeAgent' | 'activeAgentAvatarUrl' | 'activeAgentLabel'
>;

/**
 * Renders the active-agent label and avatar shared by the mobile drawer triggers.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerActiveAgentIdentity({
    activeAgent,
    activeAgentAvatarUrl,
    activeAgentLabel,
}: HeaderMobileDrawerActiveAgentIdentityProps) {
    return (
        <AgentNameWithAvatar
            label={activeAgentLabel}
            avatarUrl={activeAgentAvatarUrl}
            avatarSizeClassName="h-6 w-6"
            textClassName="text-sm font-semibold text-gray-900"
            maxWidthClassName="max-w-[12rem]"
            fallbackIcon={!activeAgent ? <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden /> : undefined}
        />
    );
}

/**
 * Props for the active-agent trigger row shown in the mobile drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerActiveAgentTriggerProps = Pick<
    HeaderMobileDrawerProps,
    | 'activeAgent'
    | 'activeAgentAvatarUrl'
    | 'activeAgentHref'
    | 'activeAgentLabel'
    | 'closeMenu'
    | 'isAdmin'
    | 'isMobileAgentsOpen'
    | 'setIsMobileAgentsOpen'
>;

/**
 * Renders either the agent-folder toggle or the active-agent navigation link.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerActiveAgentTrigger({
    activeAgent,
    activeAgentAvatarUrl,
    activeAgentHref,
    activeAgentLabel,
    closeMenu,
    isAdmin,
    isMobileAgentsOpen,
    setIsMobileAgentsOpen,
}: HeaderMobileDrawerActiveAgentTriggerProps) {
    if (isAdmin) {
        return (
            <button
                className={`${MOBILE_DRAWER_TOP_LEVEL_BUTTON_CLASSNAME} flex-1`}
                onClick={() => setIsMobileAgentsOpen(!isMobileAgentsOpen)}
            >
                <HeaderMobileDrawerActiveAgentIdentity
                    activeAgent={activeAgent}
                    activeAgentAvatarUrl={activeAgentAvatarUrl}
                    activeAgentLabel={activeAgentLabel}
                />
                <ChevronDown className={createHeaderMobileDrawerChevronClassName(isMobileAgentsOpen)} />
            </button>
        );
    }

    return (
        <HeadlessLink
            href={activeAgentHref}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
            onClick={closeMenu}
        >
            <HeaderMobileDrawerActiveAgentIdentity
                activeAgent={activeAgent}
                activeAgentAvatarUrl={activeAgentAvatarUrl}
                activeAgentLabel={activeAgentLabel}
            />
        </HeadlessLink>
    );
}

/**
 * Props for the expandable agent hierarchy section.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerAgentHierarchyProps = Pick<
    HeaderMobileDrawerProps,
    'hierarchyAgentMobileItems' | 'isAdmin' | 'isMobileAgentsOpen' | 'renderMobileNestedMenuItems'
>;

/**
 * Renders the expanded mobile agent hierarchy for admins.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerAgentHierarchy({
    hierarchyAgentMobileItems,
    isAdmin,
    isMobileAgentsOpen,
    renderMobileNestedMenuItems,
}: HeaderMobileDrawerAgentHierarchyProps) {
    if (!isAdmin || !isMobileAgentsOpen) {
        return null;
    }

    return (
        <HeaderMobileDrawerPanel className="max-h-[40vh] overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {renderMobileNestedMenuItems(hierarchyAgentMobileItems, 'mobile-agents')}
        </HeaderMobileDrawerPanel>
    );
}

/**
 * Props for the active-agent view toggle and nested items.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerActiveAgentViewSectionProps = Pick<
    HeaderMobileDrawerProps,
    | 'activeAgentView'
    | 'activeAgentViewItems'
    | 'activeAgentViewLabel'
    | 'isMobileAgentViewOpen'
    | 'renderMobileNestedMenuItems'
    | 'setIsMobileAgentViewOpen'
>;

/**
 * Renders the active-agent view submenu when the current page exposes one.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerActiveAgentViewSection({
    activeAgentView,
    activeAgentViewItems,
    activeAgentViewLabel,
    isMobileAgentViewOpen,
    renderMobileNestedMenuItems,
    setIsMobileAgentViewOpen,
}: HeaderMobileDrawerActiveAgentViewSectionProps) {
    if (!activeAgentView || activeAgentViewItems.length === 0) {
        return null;
    }

    return (
        <div className="w-full flex flex-col gap-1">
            <div className="flex items-center justify-start gap-2 text-sm font-medium text-gray-700">
                <ArrowIcon direction="right" className="h-4 w-4 text-gray-500" />
                <button
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                    onClick={() => setIsMobileAgentViewOpen(!isMobileAgentViewOpen)}
                >
                    {activeAgentViewLabel}
                    <ChevronDown className={createHeaderMobileDrawerChevronClassName(isMobileAgentViewOpen)} />
                </button>
            </div>
            {isMobileAgentViewOpen && (
                <HeaderMobileDrawerPanel className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    {renderMobileNestedMenuItems(activeAgentViewItems, 'mobile-agent-view')}
                </HeaderMobileDrawerPanel>
            )}
        </div>
    );
}

/**
 * Props for the server-scoped agent navigation block in the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerAgentSectionProps = Pick<
    HeaderMobileDrawerProps,
    | 'activeAgent'
    | 'activeAgentAvatarUrl'
    | 'activeAgentHref'
    | 'activeAgentLabel'
    | 'activeAgentView'
    | 'activeAgentViewItems'
    | 'activeAgentViewLabel'
    | 'closeMenu'
    | 'hierarchyAgentMobileItems'
    | 'isAdmin'
    | 'isMobileAgentsOpen'
    | 'isMobileAgentViewOpen'
    | 'renderMobileNestedMenuItems'
    | 'setIsMobileAgentsOpen'
    | 'setIsMobileAgentViewOpen'
    | 'translate'
>;

/**
 * Renders agent switching, active-view navigation, and search inside the drawer.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerAgentSection({
    activeAgent,
    activeAgentAvatarUrl,
    activeAgentHref,
    activeAgentLabel,
    activeAgentView,
    activeAgentViewItems,
    activeAgentViewLabel,
    closeMenu,
    hierarchyAgentMobileItems,
    isAdmin,
    isMobileAgentsOpen,
    isMobileAgentViewOpen,
    renderMobileNestedMenuItems,
    setIsMobileAgentsOpen,
    setIsMobileAgentViewOpen,
    translate,
}: HeaderMobileDrawerAgentSectionProps) {
    return (
        <div className="mt-4 flex w-full flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <ArrowIcon direction="right" className="h-4 w-4 text-gray-500" />
                <HeaderMobileDrawerActiveAgentTrigger
                    activeAgent={activeAgent}
                    activeAgentAvatarUrl={activeAgentAvatarUrl}
                    activeAgentHref={activeAgentHref}
                    activeAgentLabel={activeAgentLabel}
                    closeMenu={closeMenu}
                    isAdmin={isAdmin}
                    isMobileAgentsOpen={isMobileAgentsOpen}
                    setIsMobileAgentsOpen={setIsMobileAgentsOpen}
                />
            </div>

            <HeaderMobileDrawerAgentHierarchy
                hierarchyAgentMobileItems={hierarchyAgentMobileItems}
                isAdmin={isAdmin}
                isMobileAgentsOpen={isMobileAgentsOpen}
                renderMobileNestedMenuItems={renderMobileNestedMenuItems}
            />

            <HeaderMobileDrawerActiveAgentViewSection
                activeAgentView={activeAgentView}
                activeAgentViewItems={activeAgentViewItems}
                activeAgentViewLabel={activeAgentViewLabel}
                isMobileAgentViewOpen={isMobileAgentViewOpen}
                renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                setIsMobileAgentViewOpen={setIsMobileAgentViewOpen}
            />

            <div className="w-full pt-1">
                <HeaderSearchBox
                    placeholder={translate('header.searchThisServerPlaceholder')}
                    onNavigate={closeMenu}
                />
            </div>
        </div>
    );
}

/**
 * Props for the main server/agent navigation section inside the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerServerSectionProps = Pick<
    HeaderMobileDrawerProps,
    | 'activeAgent'
    | 'activeAgentAvatarUrl'
    | 'activeAgentHref'
    | 'activeAgentLabel'
    | 'activeAgentView'
    | 'activeAgentViewItems'
    | 'activeAgentViewLabel'
    | 'closeMenu'
    | 'federatedDropdownItems'
    | 'hierarchyAgentMobileItems'
    | 'isAdmin'
    | 'isFederatedOpen'
    | 'isMobileAgentsOpen'
    | 'isMobileAgentViewOpen'
    | 'renderMobileNestedMenuItems'
    | 'serverName'
    | 'setIsFederatedOpen'
    | 'setIsMobileAgentsOpen'
    | 'setIsMobileAgentViewOpen'
    | 'translate'
> & {
    readonly hasFederatedServers: boolean;
};

/**
 * Renders the server identity, federated switcher, and agent navigation block.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerServerSection({
    activeAgent,
    activeAgentAvatarUrl,
    activeAgentHref,
    activeAgentLabel,
    activeAgentView,
    activeAgentViewItems,
    activeAgentViewLabel,
    closeMenu,
    federatedDropdownItems,
    hasFederatedServers,
    hierarchyAgentMobileItems,
    isAdmin,
    isFederatedOpen,
    isMobileAgentsOpen,
    isMobileAgentViewOpen,
    renderMobileNestedMenuItems,
    serverName,
    setIsFederatedOpen,
    setIsMobileAgentsOpen,
    setIsMobileAgentViewOpen,
    translate,
}: HeaderMobileDrawerServerSectionProps) {
    return (
        <div className="w-full border-b border-gray-200 pb-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-gray-400">
                <span>{translate('header.menuLabel')}</span>
                {hasFederatedServers && (
                    <button
                        className="inline-flex p-1 text-gray-500 hover:text-gray-800"
                        onClick={() => setIsFederatedOpen(!isFederatedOpen)}
                        aria-label={translate('header.switchServerAria')}
                    >
                        <ChevronDown className={createHeaderMobileDrawerChevronClassName(isFederatedOpen)} />
                    </button>
                )}
            </div>
            <p className="truncate text-base font-semibold text-gray-900">{serverName}</p>

            <HeaderMobileDrawerFederatedMenu
                closeMenu={closeMenu}
                federatedDropdownItems={federatedDropdownItems}
                isFederatedOpen={isFederatedOpen}
            />

            <HeaderMobileDrawerAgentSection
                activeAgent={activeAgent}
                activeAgentAvatarUrl={activeAgentAvatarUrl}
                activeAgentHref={activeAgentHref}
                activeAgentLabel={activeAgentLabel}
                activeAgentView={activeAgentView}
                activeAgentViewItems={activeAgentViewItems}
                activeAgentViewLabel={activeAgentViewLabel}
                closeMenu={closeMenu}
                hierarchyAgentMobileItems={hierarchyAgentMobileItems}
                isAdmin={isAdmin}
                isMobileAgentsOpen={isMobileAgentsOpen}
                isMobileAgentViewOpen={isMobileAgentViewOpen}
                renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                setIsMobileAgentsOpen={setIsMobileAgentsOpen}
                setIsMobileAgentViewOpen={setIsMobileAgentViewOpen}
                translate={translate}
            />
        </div>
    );
}

/**
 * Props for the route-level hoisted action buttons shown below navigation.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerHoistedActionsProps = Pick<HeaderMobileDrawerProps, 'closeMenu' | 'menuHoistingItems'>;

/**
 * Renders the compact route-level hoisted action buttons for mobile.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerHoistedActions({
    closeMenu,
    menuHoistingItems,
}: HeaderMobileDrawerHoistedActionsProps) {
    if (menuHoistingItems.length === 0) {
        return null;
    }

    return (
        <div className="w-full border-b border-gray-200 py-3">
            <div className="flex w-full flex-wrap items-center gap-2">
                {menuHoistingItems.map((item, index) => (
                    <button
                        key={item.key || index}
                        onClick={() => {
                            item.onClick();
                            closeMenu();
                        }}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 ${
                            item.isActive ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                        title={item.name}
                    >
                        {item.icon}
                        <span className="sr-only">{item.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Props for the login/profile section near the bottom of the drawer.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerUserSectionProps = Pick<
    HeaderMobileDrawerProps,
    | 'currentUser'
    | 'currentUserAvatarLabel'
    | 'currentUserDisplayName'
    | 'currentUserProfileImageUrl'
    | 'isAdmin'
    | 'isCurrentUserAdmin'
    | 'onLogin'
    | 'onLogout'
    | 'onOpenChangePassword'
    | 'translate'
>;

/**
 * Renders either the login button or the current-user card and actions.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerUserSection({
    currentUser,
    currentUserAvatarLabel,
    currentUserDisplayName,
    currentUserProfileImageUrl,
    isAdmin,
    isCurrentUserAdmin,
    onLogin,
    onLogout,
    onOpenChangePassword,
    translate,
}: HeaderMobileDrawerUserSectionProps) {
    const shouldShowLoginButton = !currentUser && !isAdmin;
    const shouldShowCurrentUserCard = Boolean(currentUser || isAdmin);

    return (
        <div className="w-full border-b border-gray-200 py-4">
            {shouldShowLoginButton && (
                <button
                    onClick={onLogin}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
                >
                    <LogIn className="w-4 h-4" />
                    {translate('header.logIn')}
                </button>
            )}

            {shouldShowCurrentUserCard && (
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50/80 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
                            {currentUserProfileImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={currentUserProfileImageUrl}
                                    alt={`${currentUserDisplayName} avatar`}
                                    className="h-12 w-12 rounded-full object-cover border border-gray-200"
                                />
                            ) : (
                                currentUserAvatarLabel
                            )}
                        </div>
                        <div className="min-w-0 pt-1 text-sm font-medium text-gray-700">
                            {translate('header.loggedInAs', { username: currentUserDisplayName })}
                            {isCurrentUserAdmin && (
                                <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                                    {translate('common.admin')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 flex w-full flex-col gap-2">
                        <button
                            onClick={onOpenChangePassword}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
                        >
                            <Lock className="w-4 h-4" />
                            {translate('header.changePassword')}
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 active:bg-red-200"
                        >
                            <LogOut className="w-4 h-4" />
                            {translate('header.logOut')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Props for one top-level mobile menu item entry.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerMenuEntryProps = {
    readonly closeMenu: () => void;
    readonly index: number;
    readonly item: MenuItem;
    readonly renderMobileNestedMenuItems: HeaderMobileDrawerNestedMenuRenderer;
};

/**
 * Renders one top-level mobile menu item as either a direct link or a nested dropdown.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerMenuEntry({
    closeMenu,
    index,
    item,
    renderMobileNestedMenuItems,
}: HeaderMobileDrawerMenuEntryProps) {
    if (item.type === 'link') {
        return (
            <HeadlessLink
                href={item.href}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600 active:bg-gray-100"
                onClick={closeMenu}
            >
                {item.label}
            </HeadlessLink>
        );
    }

    return (
        <div className="w-full flex flex-col items-stretch gap-2">
            <button
                className={MOBILE_DRAWER_TOP_LEVEL_BUTTON_CLASSNAME}
                onClick={() => item.setIsMobileOpen(!item.isMobileOpen)}
            >
                {item.label}
                <ChevronDown className={createHeaderMobileDrawerChevronClassName(item.isMobileOpen)} />
            </button>
            {item.isMobileOpen && (
                <HeaderMobileDrawerPanel className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    {renderMobileNestedMenuItems(item.items, `mobile-menu-${index}`)}
                </HeaderMobileDrawerPanel>
            )}
        </div>
    );
}

/**
 * Props for the top-level documentation/system menu section.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerMenuItemsSectionProps = Pick<
    HeaderMobileDrawerProps,
    'closeMenu' | 'menuItems' | 'renderMobileNestedMenuItems'
>;

/**
 * Renders the remaining top-level menu items near the bottom of the drawer.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerMenuItemsSection({
    closeMenu,
    menuItems,
    renderMobileNestedMenuItems,
}: HeaderMobileDrawerMenuItemsSectionProps) {
    return (
        <>
            {menuItems.map((item, index) => (
                <HeaderMobileDrawerMenuEntry
                    key={index}
                    closeMenu={closeMenu}
                    index={index}
                    item={item}
                    renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                />
            ))}
        </>
    );
}

/**
 * Props for the disabled footer CTA placeholder.
 *
 * @private type of HeaderMobileDrawer
 */
type HeaderMobileDrawerFooterLinkProps = Pick<HeaderMobileDrawerProps, 'closeMenu'>;

/**
 * Renders the legacy footer CTA placeholder when it becomes enabled again.
 *
 * @private function of HeaderMobileDrawer
 */
function HeaderMobileDrawerFooterLink({ closeMenu }: HeaderMobileDrawerFooterLinkProps) {
    if (!just(false /* TODO: [🧠] Figure out what to do with these links */)) {
        return null;
    }

    return (
        <a
            href="https://ptbk.io/"
            target="_blank"
            className="text-base font-medium text-gray-600 hover:text-gray-900 py-2 text-center"
            onClick={closeMenu}
        >
            Create your server
        </a>
    );
}

/**
 * Renders the slide-in mobile navigation drawer and its backdrop.
 *
 * @private function of Header
 */
export function HeaderMobileDrawer({
    isOpen,
    mobileMenuDrawerRef,
    serverName,
    isAdmin,
    activeAgent,
    activeAgentLabel,
    activeAgentAvatarUrl,
    activeAgentHref,
    activeAgentView,
    activeAgentViewLabel,
    activeAgentViewItems,
    isMobileAgentsOpen,
    setIsMobileAgentsOpen,
    isMobileAgentViewOpen,
    setIsMobileAgentViewOpen,
    federatedServers,
    federatedDropdownItems,
    isFederatedOpen,
    setIsFederatedOpen,
    hoistedMobileMenuItems,
    hierarchyAgentMobileItems,
    menuHoistingItems,
    currentUser,
    currentUserDisplayName,
    currentUserProfileImageUrl,
    currentUserAvatarLabel,
    isCurrentUserAdmin,
    menuItems,
    translate,
    closeMenu,
    onLogin,
    onLogout,
    onOpenChangePassword,
    renderMobileNestedMenuItems,
}: HeaderMobileDrawerProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <>
            <div
                className="lg:hidden fixed inset-0 z-[70] bg-slate-900/35 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeMenu}
            />

            <div
                ref={mobileMenuDrawerRef}
                className="lg:hidden fixed inset-y-0 left-0 z-[80] flex h-[100dvh] w-[min(25rem,92vw)] max-w-full flex-col overflow-hidden border-r border-gray-200 bg-white shadow-2xl animate-in slide-in-from-left-4 duration-200"
                style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 pb-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <HeaderMobileDrawerHoistedMenuSection
                        hoistedMobileMenuItems={hoistedMobileMenuItems}
                        renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                    />

                    <HeaderMobileDrawerServerSection
                        activeAgent={activeAgent}
                        activeAgentAvatarUrl={activeAgentAvatarUrl}
                        activeAgentHref={activeAgentHref}
                        activeAgentLabel={activeAgentLabel}
                        activeAgentView={activeAgentView}
                        activeAgentViewItems={activeAgentViewItems}
                        activeAgentViewLabel={activeAgentViewLabel}
                        closeMenu={closeMenu}
                        federatedDropdownItems={federatedDropdownItems}
                        hasFederatedServers={federatedServers.length > 0}
                        hierarchyAgentMobileItems={hierarchyAgentMobileItems}
                        isAdmin={isAdmin}
                        isFederatedOpen={isFederatedOpen}
                        isMobileAgentsOpen={isMobileAgentsOpen}
                        isMobileAgentViewOpen={isMobileAgentViewOpen}
                        renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                        serverName={serverName}
                        setIsFederatedOpen={setIsFederatedOpen}
                        setIsMobileAgentsOpen={setIsMobileAgentsOpen}
                        setIsMobileAgentViewOpen={setIsMobileAgentViewOpen}
                        translate={translate}
                    />

                    <HeaderMobileDrawerHoistedActions closeMenu={closeMenu} menuHoistingItems={menuHoistingItems} />

                    <HeaderMobileDrawerUserSection
                        currentUser={currentUser}
                        currentUserAvatarLabel={currentUserAvatarLabel}
                        currentUserDisplayName={currentUserDisplayName}
                        currentUserProfileImageUrl={currentUserProfileImageUrl}
                        isAdmin={isAdmin}
                        isCurrentUserAdmin={isCurrentUserAdmin}
                        onLogin={onLogin}
                        onLogout={onLogout}
                        onOpenChangePassword={onOpenChangePassword}
                        translate={translate}
                    />

                    <HeaderMobileDrawerMenuItemsSection
                        closeMenu={closeMenu}
                        menuItems={menuItems}
                        renderMobileNestedMenuItems={renderMobileNestedMenuItems}
                    />

                    <HeaderMobileDrawerFooterLink closeMenu={closeMenu} />
                </nav>
            </div>
        </>
    );
}
