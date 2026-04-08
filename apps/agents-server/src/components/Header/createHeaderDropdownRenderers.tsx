'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { appendHeadlessParam, HeadlessLink } from '../_utils/headlessParam';
import { DropdownSubMenuPortal } from './DropdownSubMenuPortal';
import type { OpenSubMenuState } from './HeaderTypes';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Horizontal indentation applied for each nested submenu level in mobile navigation.
 */
const MOBILE_SUBMENU_INDENT_PX = 14;

/**
 * Dependencies required to build shared desktop/mobile submenu renderers.
 *
 * @private type of Header
 */
type CreateHeaderDropdownRenderersOptions = {
    readonly isTouchInput: boolean;
    readonly openSubMenu: OpenSubMenuState | null;
    readonly mobileOpenSubMenus: Record<string, boolean>;
    readonly desktopExpandedSubMenus: Record<string, boolean>;
    readonly dropdownPortalContainer: HTMLDivElement | null;
    readonly toggleMobileSubMenu: (key: string) => void;
    readonly toggleDesktopSubMenu: (key: string) => void;
    readonly closeMobileMenu: () => void;
    readonly isNestedSubMenuInteractive: (key: string) => boolean;
    readonly isNestedSubMenuPointerEnabled: (key: string) => boolean;
    readonly scheduleSubMenuPreviewOpen: (key: string, items: SubMenuItem[], event: MouseEvent<HTMLDivElement>) => void;
    readonly cancelMenuClose: (menuId: string) => void;
    readonly scheduleSubMenuClose: (key: string) => void;
    readonly openInteractiveSubMenu: (key: string, items: SubMenuItem[], rect: DOMRect) => void;
    readonly closeInteractiveSubMenu: (key: string) => void;
    readonly keepSubMenuOpen: () => void;
    readonly handleSubMenuPortalLeave: () => void;
    readonly scheduleMenuClose: (menuId: string, close: () => void) => void;
    readonly fallbackNavigateToHref: (href: string) => void;
    readonly isHeadless: boolean;
};

/**
 * Function set used to render the recursive header dropdown trees.
 *
 * @private type of Header
 */
type HeaderDropdownRenderers = {
    readonly renderMobileNestedMenuItems: (
        items: ReadonlyArray<SubMenuItem>,
        keyPrefix: string,
        depth?: number,
    ) => ReactNode;
    readonly renderDesktopDropdownItems: (
        items: ReadonlyArray<SubMenuItem>,
        menuId: string,
        keyPrefix: string,
        closeMenu: () => void,
    ) => ReactNode;
};

/**
 * Creates the shared recursive renderers used by the desktop dropdowns and the mobile drawer.
 *
 * @private function of Header
 */
export function createHeaderDropdownRenderers({
    isTouchInput,
    openSubMenu,
    mobileOpenSubMenus,
    desktopExpandedSubMenus,
    dropdownPortalContainer,
    toggleMobileSubMenu,
    toggleDesktopSubMenu,
    closeMobileMenu,
    isNestedSubMenuInteractive,
    isNestedSubMenuPointerEnabled,
    scheduleSubMenuPreviewOpen,
    cancelMenuClose,
    scheduleSubMenuClose,
    openInteractiveSubMenu,
    closeInteractiveSubMenu,
    keepSubMenuOpen,
    handleSubMenuPortalLeave,
    scheduleMenuClose,
    fallbackNavigateToHref,
    isHeadless,
}: CreateHeaderDropdownRenderersOptions): HeaderDropdownRenderers {
    const createMobileMenuItemPaddingStyle = (depth: number): CSSProperties => ({
        paddingLeft: `${12 + depth * MOBILE_SUBMENU_INDENT_PX}px`,
    });

    const renderSubMenuItemLabel = (item: SubMenuItem): ReactNode => {
        const ItemIcon = item.icon;

        if (!ItemIcon) {
            return item.label;
        }

        return (
            <span className="flex min-w-0 items-center gap-2">
                <ItemIcon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                <span className="min-w-0">{item.label}</span>
            </span>
        );
    };

    const renderMobileMenuLeafItem = (
        item: SubMenuItem,
        itemKey: string,
        depth: number,
        className: string,
        style: CSSProperties,
    ) => {
        if (item.href) {
            return (
                <HeadlessLink
                    key={itemKey}
                    href={item.href}
                    className={className}
                    style={style}
                    onClick={() => {
                        void item.onClick?.();
                        closeMobileMenu();
                    }}
                >
                    {renderSubMenuItemLabel(item)}
                </HeadlessLink>
            );
        }

        if (item.onClick) {
            return (
                <button
                    key={itemKey}
                    type="button"
                    className={`${className} w-full text-left`}
                    style={style}
                    onClick={() => {
                        void item.onClick?.();
                        closeMobileMenu();
                    }}
                >
                    {renderSubMenuItemLabel(item)}
                </button>
            );
        }

        return (
            <span key={itemKey} className={className} style={createMobileMenuItemPaddingStyle(depth)}>
                {renderSubMenuItemLabel(item)}
            </span>
        );
    };

    const renderMobileNestedMenuItems = (
        items: ReadonlyArray<SubMenuItem>,
        keyPrefix: string,
        depth = 0,
    ): ReactNode => (
        <div className={`w-full flex flex-col gap-1 ${depth > 0 ? 'mt-1 border-l border-gray-200 pl-1.5' : ''}`}>
            {items.map((item, index) => {
                const itemKey = `${keyPrefix}-${index}`;
                const hasChildren = Boolean(item.items && item.items.length > 0);
                const isSubMenuOpen = Boolean(mobileOpenSubMenus[itemKey]);
                const borderClass = item.isBordered ? 'border-b border-gray-200' : '';
                const leafClassName =
                    `block rounded-md py-2.5 pr-3 text-sm transition-all duration-150 hover:shadow-sm active:scale-98 ${
                        item.isBold
                            ? 'font-semibold text-gray-900 hover:bg-blue-50 hover:text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    } ${borderClass}`.trim();
                const indentationStyle = createMobileMenuItemPaddingStyle(depth);

                if (!hasChildren) {
                    return renderMobileMenuLeafItem(item, itemKey, depth, leafClassName, indentationStyle);
                }

                return (
                    <div key={itemKey} className={`w-full flex flex-col ${borderClass}`}>
                        <button
                            className="w-full flex items-center justify-between gap-2 rounded-md py-2.5 pr-3 text-left text-sm font-semibold text-gray-800 hover:bg-white hover:text-blue-600 active:bg-gray-100 active:scale-98 transition-all duration-150"
                            style={indentationStyle}
                            onClick={() => toggleMobileSubMenu(itemKey)}
                        >
                            <span className="min-w-0 flex-1">{renderSubMenuItemLabel(item)}</span>
                            <ChevronDown
                                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                                    isSubMenuOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        {isSubMenuOpen && renderMobileNestedMenuItems(item.items || [], itemKey, depth + 1)}
                    </div>
                );
            })}
        </div>
    );

    const renderDesktopDropdownLeaf = (
        item: SubMenuItem,
        key: string,
        className: string,
        onItemSelected: () => void,
    ) => {
        if (item.href) {
            const navigateToItemHref = () => {
                void item.onClick?.();
                onItemSelected();

                const destination = appendHeadlessParam(item.href!, isHeadless);
                if (typeof window !== 'undefined') {
                    window.location.assign(destination);
                    return;
                }

                fallbackNavigateToHref(item.href!);
            };

            return (
                <button
                    key={key}
                    type="button"
                    className={`${className} w-full text-left`}
                    onMouseDown={(event) => {
                        if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
                            return;
                        }
                        event.preventDefault();
                        navigateToItemHref();
                    }}
                    onClick={(event) => {
                        if (event.defaultPrevented) {
                            return;
                        }
                        event.preventDefault();
                        navigateToItemHref();
                    }}
                >
                    {renderSubMenuItemLabel(item)}
                </button>
            );
        }

        if (item.onClick) {
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => {
                        void item.onClick?.();
                        onItemSelected();
                    }}
                    className={`${className} w-full text-left`}
                >
                    {renderSubMenuItemLabel(item)}
                </button>
            );
        }

        return (
            <span key={key} className={className}>
                {renderSubMenuItemLabel(item)}
            </span>
        );
    };

    const renderTouchDesktopDropdownItems = (
        items: ReadonlyArray<SubMenuItem>,
        keyPrefix: string,
        onItemSelected: () => void,
        depth = 0,
    ): ReactNode => (
        <div className={`grid auto-rows-min gap-1 ${depth > 0 ? 'mt-1 border-l border-gray-200 pl-2' : ''}`}>
            {items.map((item, index) => {
                const itemKey = `${keyPrefix}-${index}`;
                const hasChildren = Boolean(item.items && item.items.length > 0);
                const borderClass = item.isBordered ? 'border-b border-gray-100 pb-1' : '';
                const leafClassName = `block rounded-lg px-3 py-2 text-sm ${
                    item.isBold ? 'font-medium text-gray-900' : 'text-gray-700'
                } hover:bg-white hover:text-gray-900 transition-colors ${borderClass}`;

                if (!hasChildren) {
                    return renderDesktopDropdownLeaf(item, itemKey, leafClassName, onItemSelected);
                }

                const isNestedOpen = Boolean(desktopExpandedSubMenus[itemKey]);
                return (
                    <div key={itemKey} className={borderClass}>
                        <button
                            type="button"
                            onClick={() => toggleDesktopSubMenu(itemKey)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-white hover:text-gray-900"
                        >
                            <span className="min-w-0 flex-1">{renderSubMenuItemLabel(item)}</span>
                            <ChevronDown
                                className={`h-3 w-3 text-gray-400 transition-transform ${
                                    isNestedOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        {isNestedOpen &&
                            renderTouchDesktopDropdownItems(item.items || [], itemKey, onItemSelected, depth + 1)}
                    </div>
                );
            })}
        </div>
    );

    const renderDesktopDropdownItems = (
        items: ReadonlyArray<SubMenuItem>,
        menuId: string,
        keyPrefix: string,
        closeMenu: () => void,
    ): ReactNode =>
        items.map((item, index) => {
            const itemKey = `${keyPrefix}-${index}`;
            const borderClass = item.isBordered ? 'border-b border-gray-100' : '';
            const baseClassName = `mx-1 block rounded-lg px-3 py-2.5 text-sm ${
                item.isBold ? 'font-medium text-gray-900' : 'text-gray-600'
            } hover:bg-gray-50 hover:text-gray-900 transition-colors ${borderClass}`;
            const childItems = item.items || [];
            const hasChildren = childItems.length > 0;

            if (!hasChildren) {
                return renderDesktopDropdownLeaf(item, itemKey, baseClassName, closeMenu);
            }

            const isSubMenuOpen = !isTouchInput && openSubMenu?.key === itemKey;
            const isTapSubMenuOpen = Boolean(desktopExpandedSubMenus[itemKey]);
            const isSubMenuInteractive = isNestedSubMenuInteractive(itemKey);
            const isSubMenuPointerEnabled = isNestedSubMenuPointerEnabled(itemKey);

            return (
                <div
                    key={itemKey}
                    className={`relative mx-1 rounded-lg ${borderClass}`}
                    onMouseEnter={(event) => {
                        if (isTouchInput) {
                            return;
                        }
                        scheduleSubMenuPreviewOpen(itemKey, childItems, event);
                        cancelMenuClose(menuId);
                    }}
                    onMouseLeave={() => {
                        if (isTouchInput) {
                            return;
                        }
                        scheduleSubMenuClose(itemKey);
                    }}
                >
                    <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                            item.isBold ? 'font-medium text-gray-900' : 'text-gray-600'
                        } hover:bg-gray-50 hover:text-gray-900 transition-colors`}
                        onClick={(event) => {
                            cancelMenuClose(menuId);
                            if (isTouchInput) {
                                toggleDesktopSubMenu(itemKey);
                                return;
                            }

                            const rect = (
                                event.currentTarget.parentElement ?? event.currentTarget
                            ).getBoundingClientRect();
                            if (openSubMenu?.key === itemKey && isSubMenuInteractive) {
                                closeInteractiveSubMenu(itemKey);
                                return;
                            }
                            openInteractiveSubMenu(itemKey, childItems, rect);
                        }}
                    >
                        <span className="min-w-0 flex-1">{renderSubMenuItemLabel(item)}</span>
                        <ChevronRight
                            className={`h-3 w-3 text-gray-400 transition-transform ${
                                isTouchInput && isTapSubMenuOpen ? 'rotate-90' : ''
                            }`}
                        />
                    </button>

                    {isTouchInput && isTapSubMenuOpen && (
                        <div className="mx-1 mb-2 rounded-xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/80 p-2">
                            {renderTouchDesktopDropdownItems(childItems, itemKey, closeMenu)}
                        </div>
                    )}

                    {isSubMenuOpen && openSubMenu && (
                        <DropdownSubMenuPortal
                            anchorRect={openSubMenu.rect}
                            container={dropdownPortalContainer}
                            isInteractive={isSubMenuPointerEnabled}
                            onMouseEnter={() => {
                                keepSubMenuOpen();
                                cancelMenuClose(menuId);
                            }}
                            onMouseLeave={() => {
                                handleSubMenuPortalLeave();
                                scheduleMenuClose(menuId, closeMenu);
                            }}
                        >
                            <div
                                className={`max-h-[70vh] w-[min(320px,calc(100vw-4rem))] overflow-y-auto rounded-xl border border-gray-100 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur ${
                                    isSubMenuPointerEnabled ? 'pointer-events-auto' : 'pointer-events-none'
                                }`}
                            >
                                <div className="flex flex-col gap-1">
                                    {childItems.map((child, childIndex) =>
                                        renderDesktopDropdownLeaf(
                                            child,
                                            `${itemKey}-portal-child-${childIndex}`,
                                            'block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
                                            closeMenu,
                                        ),
                                    )}
                                </div>
                            </div>
                        </DropdownSubMenuPortal>
                    )}
                </div>
            );
        });

    return {
        renderMobileNestedMenuItems,
        renderDesktopDropdownItems,
    };
}
