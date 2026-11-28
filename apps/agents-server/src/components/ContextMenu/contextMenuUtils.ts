'use client';

import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

/**
 * Cursor point used to anchor a floating context menu.
 */
export type ContextMenuAnchorPoint = {
    readonly x: number;
    readonly y: number;
};

/**
 * Viewport padding kept around floating context menus.
 */
const CONTEXT_MENU_VIEWPORT_PADDING = 12;

/**
 * Shared viewport constraints for context menu panels.
 */
export const contextMenuViewportStyle = {
    maxHeight: `calc(100vh - ${CONTEXT_MENU_VIEWPORT_PADDING * 2}px)`,
    maxWidth: `calc(100vw - ${CONTEXT_MENU_VIEWPORT_PADDING * 2}px)`,
};

/**
 * Registers an outside-click listener that closes a floating menu.
 *
 * @param ref - Ref to the menu container.
 * @param onClose - Callback invoked on outside click.
 * @param isActive - Whether the listener should be active.
 */
export function useCloseOnOutsideClick(ref: RefObject<HTMLElement | null>, onClose: () => void, isActive: boolean) {
    useEffect(() => {
        if (!isActive) {
            return;
        }

        /**
         * Closes the menu when clicking outside the menu container.
         *
         * @param event - Mouse event dispatched on the document.
         */
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isActive, onClose, ref]);
}

/**
 * Computes a clamped floating-menu position from the cursor anchor point.
 *
 * @param anchorPoint - Cursor anchor coordinates.
 * @param isOpen - Whether the menu is currently visible.
 * @param menuRef - Ref used to measure menu dimensions.
 * @returns Clamped coordinates for menu placement.
 */
export function useClampedMenuPosition(
    anchorPoint: ContextMenuAnchorPoint | null,
    isOpen: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
) {
    const [position, setPosition] = useState<ContextMenuAnchorPoint | null>(null);

    useEffect(() => {
        if (!isOpen || !anchorPoint || !menuRef.current) {
            return;
        }

        const rect = menuRef.current.getBoundingClientRect();
        const maxX = Math.max(CONTEXT_MENU_VIEWPORT_PADDING, window.innerWidth - rect.width - CONTEXT_MENU_VIEWPORT_PADDING);
        const maxY = Math.max(
            CONTEXT_MENU_VIEWPORT_PADDING,
            window.innerHeight - rect.height - CONTEXT_MENU_VIEWPORT_PADDING,
        );
        const nextX = Math.min(anchorPoint.x, maxX);
        const nextY = Math.min(anchorPoint.y, maxY);

        setPosition({
            x: Math.max(CONTEXT_MENU_VIEWPORT_PADDING, nextX),
            y: Math.max(CONTEXT_MENU_VIEWPORT_PADDING, nextY),
        });
    }, [anchorPoint, isOpen, menuRef]);

    return position;
}
