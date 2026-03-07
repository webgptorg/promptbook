import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Props for floating nested dropdown submenu rendered in a portal.
 *
 * @private internal props of <DropdownSubMenuPortal/>
 */
export type DropdownSubMenuPortalProps = {
    anchorRect: DOMRect;
    container: HTMLElement | null;
    children: ReactNode;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
};

/**
 * Renders a floating sub-menu column detached from scrollable dropdown content.
 *
 * @private function of <Header/>
 */
export function DropdownSubMenuPortal({
    anchorRect,
    container,
    children,
    onMouseEnter,
    onMouseLeave,
}: DropdownSubMenuPortalProps) {
    if (!container) {
        return null;
    }

    return createPortal(
        <div
            className="pointer-events-none fixed z-[80]"
            style={{
                top: anchorRect.top,
                left: anchorRect.right + 8,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>,
        container,
    );
}
