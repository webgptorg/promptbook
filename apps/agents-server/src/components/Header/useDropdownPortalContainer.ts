'use client';

import { useEffect, useState } from 'react';

/**
 * @private Hook that provides a dedicated DOM node for header submenu portals.
 */
export function useDropdownPortalContainer() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const element = document.createElement('div');
        element.setAttribute('data-header-dropdown-portal', 'true');
        document.body.appendChild(element);
        setContainer(element);

        return () => {
            document.body.removeChild(element);
        };
    }, []);

    return container;
}
