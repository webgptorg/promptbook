'use client';

import { ChevronDown, FolderIcon, Lock, LogIn, LogOut } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import type { HoistedMenuItem } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { ArrowIcon } from '../../../../../src/book-components/icons/ArrowIcon';
import { just } from '../../../../../src/utils/organization/just';
import { AgentNameWithAvatar } from './AgentNameWithAvatar';
import type { AgentHierarchyView } from './createAgentViewLabel';
import { HeadlessLink } from '../_utils/headlessParam';
import { HeaderSearchBox } from './HeaderSearchBox';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
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
 * @private type of Header
 */
type HeaderTranslate = (key: ServerTranslationKey, variables?: Record<string, string>) => string;

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
    readonly renderMobileNestedMenuItems: (
        items: ReadonlyArray<SubMenuItem>,
        keyPrefix: string,
        depth?: number,
    ) => ReactNode;
};

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
                    {hoistedMobileMenuItems.length > 0 && (
                        <div className="w-full border-b border-gray-200 pb-4">
                            {renderMobileNestedMenuItems(hoistedMobileMenuItems, 'mobile-hoisted-menu')}
                        </div>
                    )}

                    <div className="w-full border-b border-gray-200 pb-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-gray-400">
                            <span>{translate('header.menuLabel')}</span>
                            {federatedServers.length > 0 && (
                                <button
                                    className="inline-flex p-1 text-gray-500 hover:text-gray-800"
                                    onClick={() => setIsFederatedOpen(!isFederatedOpen)}
                                    aria-label={translate('header.switchServerAria')}
                                >
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            isFederatedOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                            )}
                        </div>
                        <p className="truncate text-base font-semibold text-gray-900">{serverName}</p>
                        {isFederatedOpen && federatedDropdownItems.length > 0 && (
                            <div
                                className={`${MOBILE_DRAWER_PANEL_CLASSNAME} mt-3 animate-in fade-in-0 slide-in-from-top-2 duration-200`}
                            >
                                {federatedDropdownItems.map((subItem, subIndex) => {
                                    const className = `block rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-white hover:text-gray-900 active:bg-gray-100 ${
                                        subItem.isBold ? 'font-semibold' : ''
                                    }`;
                                    if (subItem.href) {
                                        return (
                                            <HeadlessLink
                                                key={`mobile-federated-${subIndex}`}
                                                href={subItem.href}
                                                className={className}
                                                onClick={closeMenu}
                                            >
                                                {subItem.label}
                                            </HeadlessLink>
                                        );
                                    }
                                    return (
                                        <span key={`mobile-federated-${subIndex}`} className={className}>
                                            {subItem.label}
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-4 flex w-full flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                <ArrowIcon direction="right" className="h-4 w-4 text-gray-500" />
                                {isAdmin ? (
                                    <button
                                        className={`${MOBILE_DRAWER_TOP_LEVEL_BUTTON_CLASSNAME} flex-1`}
                                        onClick={() => setIsMobileAgentsOpen(!isMobileAgentsOpen)}
                                    >
                                        <AgentNameWithAvatar
                                            label={activeAgentLabel}
                                            avatarUrl={activeAgentAvatarUrl}
                                            avatarSizeClassName="h-6 w-6"
                                            textClassName="text-sm font-semibold text-gray-900"
                                            maxWidthClassName="max-w-[12rem]"
                                            fallbackIcon={
                                                !activeAgent ? (
                                                    <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
                                                ) : undefined
                                            }
                                        />
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform duration-200 ${
                                                isMobileAgentsOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>
                                ) : (
                                    <HeadlessLink
                                        href={activeAgentHref}
                                        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                                        onClick={closeMenu}
                                    >
                                        <AgentNameWithAvatar
                                            label={activeAgentLabel}
                                            avatarUrl={activeAgentAvatarUrl}
                                            avatarSizeClassName="h-6 w-6"
                                            textClassName="text-sm font-semibold text-gray-900"
                                            maxWidthClassName="max-w-[12rem]"
                                            fallbackIcon={
                                                !activeAgent ? (
                                                    <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
                                                ) : undefined
                                            }
                                        />
                                    </HeadlessLink>
                                )}
                            </div>

                            {isAdmin && isMobileAgentsOpen && (
                                <div
                                    className={`${MOBILE_DRAWER_PANEL_CLASSNAME} max-h-[40vh] overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100`}
                                >
                                    {renderMobileNestedMenuItems(hierarchyAgentMobileItems, 'mobile-agents')}
                                </div>
                            )}

                            {activeAgentView && activeAgentViewItems.length > 0 && (
                                <div className="w-full flex flex-col gap-1">
                                    <div className="flex items-center justify-start gap-2 text-sm font-medium text-gray-700">
                                        <ArrowIcon direction="right" className="h-4 w-4 text-gray-500" />
                                        <button
                                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                                            onClick={() => setIsMobileAgentViewOpen(!isMobileAgentViewOpen)}
                                        >
                                            {activeAgentViewLabel}
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform duration-200 ${
                                                    isMobileAgentViewOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    {isMobileAgentViewOpen && (
                                        <div
                                            className={`${MOBILE_DRAWER_PANEL_CLASSNAME} animate-in fade-in-0 slide-in-from-top-2 duration-200`}
                                        >
                                            {renderMobileNestedMenuItems(activeAgentViewItems, 'mobile-agent-view')}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="w-full pt-1">
                                <HeaderSearchBox
                                    placeholder={translate('header.searchThisServerPlaceholder')}
                                    onNavigate={closeMenu}
                                />
                            </div>
                        </div>
                    </div>

                    {menuHoistingItems.length > 0 && (
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
                    )}

                    <div className="w-full border-b border-gray-200 py-4">
                        {!currentUser && !isAdmin && (
                            <button
                                onClick={onLogin}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
                            >
                                <LogIn className="w-4 h-4" />
                                {translate('header.logIn')}
                            </button>
                        )}

                        {(currentUser || isAdmin) && (
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

                    {menuItems.map((item, index) => {
                        if (item.type === 'link') {
                            return (
                                <HeadlessLink
                                    key={index}
                                    href={item.href}
                                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600 active:bg-gray-100"
                                    onClick={closeMenu}
                                >
                                    {item.label}
                                </HeadlessLink>
                            );
                        }

                        return (
                            <div key={index} className="w-full flex flex-col items-stretch gap-2">
                                <button
                                    className={MOBILE_DRAWER_TOP_LEVEL_BUTTON_CLASSNAME}
                                    onClick={() => item.setIsMobileOpen(!item.isMobileOpen)}
                                >
                                    {item.label}
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                            item.isMobileOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {item.isMobileOpen && (
                                    <div
                                        className={`${MOBILE_DRAWER_PANEL_CLASSNAME} animate-in fade-in-0 slide-in-from-top-2 duration-200`}
                                    >
                                        {renderMobileNestedMenuItems(item.items, `mobile-menu-${index}`)}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {just(false /* TODO: [🧠] Figure out what to do with these links */) && (
                        <a
                            href="https://ptbk.io/"
                            target="_blank"
                            className="text-base font-medium text-gray-600 hover:text-gray-900 py-2 text-center"
                            onClick={closeMenu}
                        >
                            Create your server
                        </a>
                    )}
                </nav>
            </div>
        </>
    );
}
