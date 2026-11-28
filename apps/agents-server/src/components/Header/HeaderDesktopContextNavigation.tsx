'use client';

import { ChevronDown, FolderIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowIcon } from '../../../../../src/book-components/icons/ArrowIcon';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { HeadlessLink } from '../_utils/headlessParam';
import type { AgentMenuTreeNode } from './AgentMenuStructure';
import { AgentDirectoryDropdown } from './AgentDirectoryDropdown';
import { AgentNameWithAvatar } from './AgentNameWithAvatar';
import type { AgentHierarchyView } from './createAgentViewLabel';
import { HeaderHomepageLink } from './HeaderHomepageLink';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Props for the extracted desktop header context-navigation section.
 *
 * @private type of Header
 */
type HeaderDesktopContextNavigationProps = {
    readonly activeAgent: AgentOrganizationAgent | null;
    readonly activeAgentAvatarUrl: string | null;
    readonly activeAgentHref: string;
    readonly activeAgentLabel: string;
    readonly activeAgentView: AgentHierarchyView | null;
    readonly activeAgentViewButtonLabel: ReactNode;
    readonly activeAgentViewItems: ReadonlyArray<SubMenuItem>;
    readonly agentMenuTree: ReadonlyArray<AgentMenuTreeNode>;
    readonly cancelMenuClose: (menuId: string) => void;
    readonly closeAgentViewDesktopDropdown: () => void;
    readonly closeAgentsDropdown: () => void;
    readonly closeFederatedDesktopDropdown: () => void;
    readonly createNewAgentLabel: ReactNode;
    readonly federatedDropdownItems: ReadonlyArray<SubMenuItem>;
    readonly hasFederatedServers: boolean;
    readonly isAdmin: boolean;
    readonly isAgentViewDesktopPointerEnabled: boolean;
    readonly isAgentViewOpen: boolean;
    readonly isAgentsDesktopPointerEnabled: boolean;
    readonly isAgentsOpen: boolean;
    readonly isFederatedDesktopPointerEnabled: boolean;
    readonly isFederatedOpen: boolean;
    readonly isTouchInput: boolean;
    readonly onCreateAgent: (() => void) | undefined;
    readonly renderDesktopDropdownItems: (
        items: ReadonlyArray<SubMenuItem>,
        menuId: string,
        keyPrefix: string,
        closeMenu: () => void,
    ) => ReactNode;
    readonly scheduleMenuClose: (menuId: string, close: () => void) => void;
    readonly serverName: string;
    readonly serverLogoUrl: string | null;
    readonly setIsAgentViewOpen: (isOpen: boolean) => void;
    readonly setIsAgentsOpen: (isOpen: boolean) => void;
    readonly setIsFederatedOpen: (isOpen: boolean) => void;
    readonly startDesktopDropdownPreview: (menuId: string, isOpen: boolean, open: () => void) => void;
    readonly switchServerAriaLabel: string;
    readonly toggleAgentViewDesktopDropdown: () => void;
    readonly toggleAgentsDesktopDropdown: () => void;
    readonly toggleFederatedDesktopDropdown: () => void;
    readonly viewAllAgentsLabel: string;
};

/**
 * Renders the desktop breadcrumb-style server, agent, and agent-view navigation controls.
 *
 * @private function of Header
 */
export function HeaderDesktopContextNavigation({
    activeAgent,
    activeAgentAvatarUrl,
    activeAgentHref,
    activeAgentLabel,
    activeAgentView,
    activeAgentViewButtonLabel,
    activeAgentViewItems,
    agentMenuTree,
    cancelMenuClose,
    closeAgentViewDesktopDropdown,
    closeAgentsDropdown,
    closeFederatedDesktopDropdown,
    createNewAgentLabel,
    federatedDropdownItems,
    hasFederatedServers,
    isAdmin,
    isAgentViewDesktopPointerEnabled,
    isAgentViewOpen,
    isAgentsDesktopPointerEnabled,
    isAgentsOpen,
    isFederatedDesktopPointerEnabled,
    isFederatedOpen,
    isTouchInput,
    onCreateAgent,
    renderDesktopDropdownItems,
    scheduleMenuClose,
    serverName,
    serverLogoUrl,
    setIsAgentViewOpen,
    setIsAgentsOpen,
    setIsFederatedOpen,
    startDesktopDropdownPreview,
    switchServerAriaLabel,
    toggleAgentViewDesktopDropdown,
    toggleAgentsDesktopDropdown,
    toggleFederatedDesktopDropdown,
    viewAllAgentsLabel,
}: HeaderDesktopContextNavigationProps) {
    return (
        <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-white/90 px-2 sm:px-3 md:px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm shadow-slate-200/60 backdrop-blur">
                <div className="relative flex min-w-0 items-center gap-3">
                    <HeaderHomepageLink
                        serverName={serverName}
                        serverLogoUrl={serverLogoUrl}
                        className="relative z-[1] transition-opacity hover:opacity-80"
                        labelClassName="max-w-[180px] sm:max-w-[200px] md:max-w-[250px] lg:max-w-none"
                        isCompactOnMobile={true}
                    />

                    {hasFederatedServers && (
                        <div
                            className="relative hidden lg:block"
                            onMouseEnter={() =>
                                startDesktopDropdownPreview('federated-server-switcher', isFederatedOpen, () =>
                                    setIsFederatedOpen(true),
                                )
                            }
                            onMouseLeave={() =>
                                scheduleMenuClose('federated-server-switcher', () => setIsFederatedOpen(false))
                            }
                        >
                            <button
                                type="button"
                                className="inline-flex p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                onClick={toggleFederatedDesktopDropdown}
                                onMouseEnter={() => {
                                    startDesktopDropdownPreview('federated-server-switcher', isFederatedOpen, () =>
                                        setIsFederatedOpen(true),
                                    );
                                }}
                                onBlur={() =>
                                    scheduleMenuClose('federated-server-switcher', () => setIsFederatedOpen(false))
                                }
                                title={switchServerAriaLabel}
                                aria-label={switchServerAriaLabel}
                                aria-expanded={isFederatedOpen}
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {isFederatedOpen && (
                                <div
                                    className={`absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto backdrop-blur ${
                                        isFederatedDesktopPointerEnabled ? 'pointer-events-auto' : 'pointer-events-none'
                                    }`}
                                    onMouseEnter={() => cancelMenuClose('federated-server-switcher')}
                                    onMouseLeave={() =>
                                        scheduleMenuClose('federated-server-switcher', () => setIsFederatedOpen(false))
                                    }
                                >
                                    {federatedDropdownItems.map((subItem, subIndex) => {
                                        const className = `mx-1 block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${
                                            subItem.isBold ? 'font-medium' : ''
                                        } ${subItem.isBordered ? 'border-b border-gray-100' : ''}`;

                                        if (subItem.href) {
                                            return (
                                                <HeadlessLink
                                                    key={`federated-${subIndex}`}
                                                    href={subItem.href}
                                                    className={className}
                                                    onClick={closeFederatedDesktopDropdown}
                                                >
                                                    {subItem.label}
                                                </HeadlessLink>
                                            );
                                        }

                                        return (
                                            <span key={`federated-${subIndex}`} className={className}>
                                                {subItem.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <ArrowIcon direction="right" className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />

                {isAdmin ? (
                    <div
                        className="relative min-w-0"
                        onMouseEnter={() =>
                            startDesktopDropdownPreview('agents-hierarchy', isAgentsOpen, () => setIsAgentsOpen(true))
                        }
                        onMouseLeave={() =>
                            scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))
                        }
                    >
                        <button
                            type="button"
                            className="flex min-w-0 items-center gap-2 rounded-full border border-transparent px-2 sm:px-3 py-1 hover:border-gray-200 hover:bg-gray-100 transition"
                            onClick={toggleAgentsDesktopDropdown}
                            onMouseEnter={() => {
                                startDesktopDropdownPreview('agents-hierarchy', isAgentsOpen, () =>
                                    setIsAgentsOpen(true),
                                );
                            }}
                            onBlur={() =>
                                scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))
                            }
                            aria-expanded={isAgentsOpen}
                        >
                            <AgentNameWithAvatar
                                agent={activeAgent}
                                label={activeAgentLabel}
                                avatarUrl={activeAgentAvatarUrl}
                                avatarSizeClassName="h-5 w-5"
                                avatarSize={20}
                                textClassName="text-xs sm:text-sm font-semibold text-gray-900"
                                maxWidthClassName="max-w-[80px] sm:max-w-[120px] md:max-w-[180px] lg:max-w-[200px]"
                                fallbackIcon={
                                    !activeAgent ? <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden /> : undefined
                                }
                            />
                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        </button>

                        {isAgentsOpen && (
                            <div
                                className={`absolute left-0 top-full z-50 mt-2 w-[min(420px,90vw)] rounded-2xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 overflow-visible backdrop-blur ${
                                    isAgentsDesktopPointerEnabled ? 'pointer-events-auto' : 'pointer-events-none'
                                }`}
                                onMouseEnter={() => cancelMenuClose('agents-hierarchy')}
                                onMouseLeave={() =>
                                    scheduleMenuClose('agents-hierarchy', () => setIsAgentsOpen(false))
                                }
                            >
                                <AgentDirectoryDropdown
                                    nodes={agentMenuTree}
                                    onNavigate={closeAgentsDropdown}
                                    isTouchInput={isTouchInput}
                                />
                                <div className="border-t border-gray-100 p-1.5">
                                    <HeadlessLink
                                        href="/agents"
                                        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                                        onClick={closeAgentsDropdown}
                                    >
                                        {viewAllAgentsLabel}
                                    </HeadlessLink>
                                    <button
                                        type="button"
                                        onClick={onCreateAgent}
                                        className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                                    >
                                        {createNewAgentLabel}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <HeadlessLink
                        href={activeAgentHref}
                        className="inline-flex min-w-0 items-center gap-2 rounded-full px-2 sm:px-3 py-1 hover:bg-gray-100 transition"
                    >
                        <AgentNameWithAvatar
                            agent={activeAgent}
                            label={activeAgentLabel}
                            avatarUrl={activeAgentAvatarUrl}
                            avatarSizeClassName="h-7 w-7"
                            avatarSize={28}
                            textClassName="text-xs sm:text-sm font-semibold text-gray-900"
                            maxWidthClassName="max-w-[80px] sm:max-w-[120px] md:max-w-[180px] lg:max-w-[200px]"
                            fallbackIcon={
                                !activeAgent ? <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden /> : undefined
                            }
                        />
                    </HeadlessLink>
                )}

                {activeAgentView && activeAgentViewItems.length > 0 && (
                    <>
                        <ArrowIcon direction="right" className="hidden sm:block h-4 w-4 text-gray-500" />
                        <div
                            className="relative hidden sm:block"
                            onMouseEnter={() =>
                                startDesktopDropdownPreview('agent-view', isAgentViewOpen, () =>
                                    setIsAgentViewOpen(true),
                                )
                            }
                            onMouseLeave={() =>
                                scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))
                            }
                        >
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                                onClick={toggleAgentViewDesktopDropdown}
                                onMouseEnter={() => {
                                    startDesktopDropdownPreview('agent-view', isAgentViewOpen, () =>
                                        setIsAgentViewOpen(true),
                                    );
                                }}
                                onBlur={() =>
                                    scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))
                                }
                                aria-expanded={isAgentViewOpen}
                            >
                                {activeAgentViewButtonLabel}
                                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                            </button>

                            {isAgentViewOpen && (
                                <div
                                    className={`absolute left-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 backdrop-blur ${
                                        isAgentViewDesktopPointerEnabled
                                            ? 'pointer-events-auto'
                                            : 'pointer-events-none'
                                    }`}
                                    onMouseEnter={() => cancelMenuClose('agent-view')}
                                    onMouseLeave={() =>
                                        scheduleMenuClose('agent-view', () => setIsAgentViewOpen(false))
                                    }
                                >
                                    <div className="max-h-[80vh] overflow-y-auto overflow-x-visible">
                                        {renderDesktopDropdownItems(
                                            activeAgentViewItems,
                                            'agent-view',
                                            'agent-view-dropdown',
                                            closeAgentViewDesktopDropdown,
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
