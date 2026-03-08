import type { ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Props for a floating submenu portal used by the header dropdowns.
 *
 * @private type of Header
 */
export type DropdownSubMenuPortalProps = {
    anchorRect: DOMRect;
    container: HTMLDivElement | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    children: ReactNode;
};

/**
 * Renders a floating sub-menu column that is detached from the scrollable dropdown content.
 *
 * @private function of Header
 */
export function DropdownSubMenuPortal({
    anchorRect,
    container,
    onMouseEnter,
    onMouseLeave,
    children,
}: DropdownSubMenuPortalProps) {
    const [position, setPosition] = useState(() => ({
        top: anchorRect.top,
        left: anchorRect.right + 8,
    }));

    useLayoutEffect(() => {
        if (!container) {
            return;
        }

        const updatePosition = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const panelWidth = Math.min(320, viewportWidth - 32);
            const gap = 8;

            const canOpenOnRight = anchorRect.right + gap + panelWidth <= viewportWidth - 16;
            const left = canOpenOnRight
                ? anchorRect.right + gap
                : Math.max(16, Math.min(anchorRect.left - gap - panelWidth, viewportWidth - panelWidth - 16));

            const top = Math.min(Math.max(12, anchorRect.top), viewportHeight - 48);
            setPosition({ left, top });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRect.top, anchorRect.left, anchorRect.right, container]);

    if (!container) {
        return null;
    }

    return createPortal(
        <div
            className="fixed z-50"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>,
        container,
    );
}
