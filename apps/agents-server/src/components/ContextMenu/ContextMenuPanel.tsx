'use client';

import { Barlow_Condensed } from 'next/font/google';
import type { CSSProperties } from 'react';
import type { ComponentType } from 'react';
import { contextMenuViewportStyle } from './contextMenuUtils';

/**
 * Visual separator item inside a context menu.
 */
export type ContextMenuDividerItem = {
    readonly type: 'divider';
};

/**
 * Action button item inside a context menu.
 */
export type ContextMenuActionItem = {
    readonly type: 'action';
    readonly icon: ComponentType<{ className?: string }>;
    readonly label: string;
    readonly onClick?: () => void;
    readonly closeOnClick?: boolean;
    readonly highlight?: boolean;
};

/**
 * Link item inside a context menu.
 */
export type ContextMenuLinkItem = {
    readonly type: 'link';
    readonly href: string;
    readonly icon: ComponentType<{ className?: string }>;
    readonly label: string;
    readonly target?: string;
};

/**
 * Unified menu item descriptor used by context menu panels.
 */
export type ContextMenuItem = ContextMenuDividerItem | ContextMenuActionItem | ContextMenuLinkItem;

/**
 * Shared condensed font used by context menu panels.
 */
const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-barlow-condensed',
});

/**
 * Props for the reusable context menu panel.
 */
type ContextMenuPanelProps = {
    /**
     * Ordered list of menu items to render.
     */
    readonly menuItems: readonly ContextMenuItem[];
    /**
     * Callback invoked when the menu should close.
     */
    readonly onClose: () => void;
    /**
     * Optional extra classes for sizing or layout adjustments.
     */
    readonly className?: string;
    /**
     * Optional inline style overrides.
     */
    readonly style?: CSSProperties;
};

/**
 * Renders a shared context menu panel with links, actions, and dividers.
 */
export function ContextMenuPanel({ menuItems, onClose, className = 'w-56', style }: ContextMenuPanelProps) {
    return (
        <div
            className={`bg-white rounded-xl shadow-2xl border border-gray-100 py-2 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 ${className} ${barlowCondensed.className}`.trim()}
            style={{ ...contextMenuViewportStyle, ...style }}
        >
            {menuItems.map((item, index) => {
                if (item.type === 'divider') {
                    return <div key={index} className="h-px bg-gray-100 my-2" />;
                }

                if (item.type === 'link') {
                    return (
                        <a
                            key={index}
                            href={item.href}
                            target={item.target}
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={onClose}
                        >
                            <item.icon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </a>
                    );
                }

                return (
                    <button
                        key={index}
                        onClick={() => {
                            item.onClick?.();
                            if (item.closeOnClick) {
                                onClose();
                            }
                        }}
                        className={`flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors ${
                            item.highlight
                                ? 'bg-yellow-100 text-yellow-900 font-bold hover:bg-yellow-200'
                                : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <item.icon className={`w-4 h-4 ${item.highlight ? 'text-yellow-700' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
