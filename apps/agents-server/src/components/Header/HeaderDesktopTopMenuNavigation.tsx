'use client';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { HeadlessLink } from '../_utils/headlessParam';
import type { MenuItem } from './HeaderTypes';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Props for the extracted desktop top-menu navigation strip.
 *
 * @private type of Header
 */
type HeaderDesktopTopMenuNavigationProps = {
    readonly items: ReadonlyArray<MenuItem>;
    readonly isDesktopDropdownInteractive: (menuId: string) => boolean;
    readonly openInteractiveDesktopDropdown: (menuId: string, open: () => void) => void;
    readonly closeDesktopDropdownNow: (menuId: string, close: () => void) => void;
    readonly startDesktopDropdownPreview: (menuId: string, isOpen: boolean, open: () => void) => void;
    readonly scheduleMenuClose: (menuId: string, close: () => void) => void;
    readonly cancelMenuClose: (menuId: string) => void;
    readonly isDesktopDropdownPointerEnabled: (menuId: string) => boolean;
    readonly renderDesktopDropdownItems: (
        items: ReadonlyArray<SubMenuItem>,
        menuId: string,
        keyPrefix: string,
        closeMenu: () => void,
    ) => ReactNode;
};

/**
 * Renders desktop-only top-level navigation entries shown to the right of the search slot.
 *
 * @private function of Header
 */
export function HeaderDesktopTopMenuNavigation({
    items,
    isDesktopDropdownInteractive,
    openInteractiveDesktopDropdown,
    closeDesktopDropdownNow,
    startDesktopDropdownPreview,
    scheduleMenuClose,
    cancelMenuClose,
    isDesktopDropdownPointerEnabled,
    renderDesktopDropdownItems,
}: HeaderDesktopTopMenuNavigationProps) {
    return (
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            {items.map((item, index) => {
                if (item.type === 'link') {
                    return (
                        <HeadlessLink
                            key={index}
                            href={item.href}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            {item.label}
                        </HeadlessLink>
                    );
                }

                const dropdownItems = item.items ?? [];
                const closeDropdown = () => {
                    closeDesktopDropdownNow(item.id, () => item.setIsOpen(false));
                };
                const toggleDropdown = () => {
                    if (item.isOpen && isDesktopDropdownInteractive(item.id)) {
                        closeDropdown();
                        return;
                    }
                    openInteractiveDesktopDropdown(item.id, () => item.setIsOpen(true));
                };
                const isDropdownPointerEnabled = isDesktopDropdownPointerEnabled(item.id);

                return (
                    <div
                        key={index}
                        className="relative"
                        onMouseEnter={() => {
                            startDesktopDropdownPreview(item.id, item.isOpen, () => item.setIsOpen(true));
                        }}
                        onMouseLeave={() => scheduleMenuClose(item.id, () => item.setIsOpen(false))}
                    >
                        <button
                            type="button"
                            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            onClick={toggleDropdown}
                            onMouseEnter={() => {
                                startDesktopDropdownPreview(item.id, item.isOpen, () => item.setIsOpen(true));
                            }}
                            onBlur={() => scheduleMenuClose(item.id, () => item.setIsOpen(false))}
                            aria-expanded={item.isOpen}
                        >
                            {item.label}
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {item.isOpen && (
                            <div
                                className={`absolute left-0 top-full z-50 mt-2 w-[min(420px,90vw)] rounded-2xl border border-gray-100 bg-white/95 py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200 backdrop-blur ${
                                    isDropdownPointerEnabled ? 'pointer-events-auto' : 'pointer-events-none'
                                }`}
                                onMouseEnter={() => cancelMenuClose(item.id)}
                                onMouseLeave={() => scheduleMenuClose(item.id, () => item.setIsOpen(false))}
                            >
                                {item.renderMenu ? (
                                    <div className="relative">{item.renderMenu()}</div>
                                ) : (
                                    <div className="max-h-[80vh] overflow-y-auto overflow-x-visible">
                                        {renderDesktopDropdownItems(dropdownItems, item.id, `${item.id}-dropdown`, closeDropdown)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
