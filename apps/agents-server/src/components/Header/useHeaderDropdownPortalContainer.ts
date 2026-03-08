import { useEffect, useState } from 'react';

/**
 * Provides a reusable DOM node for rendering header submenus via portals.
 *
 * @private function of Header
 */
export function useHeaderDropdownPortalContainer() {
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
