'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * Provides a reusable DOM node for rendering header submenus via portals.
 *
 * @private function of <Header/>
 */
export function useDropdownPortalContainer() {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useLayoutEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const node = document.createElement('div');
        node.dataset.headerSubmenuPortal = 'true';
        node.style.position = 'relative';
        node.style.zIndex = '70';
        document.body.appendChild(node);
        setContainer(node);

        return () => {
            document.body.removeChild(node);
            setContainer(null);
        };
    }, []);

    return container;
}
