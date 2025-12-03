'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type PortalProps = {
    children: ReactNode;
    /**
     * Optional container id. Defaults to "portal-root".
     * This allows reusing the Portal component for different layers if needed.
     */
    containerId?: string;
};

/**
 * Generic portal component that renders children into a DOM node
 * outside of the normal React tree (by default #portal-root).
 *
 * This is useful for modals/popups that should visually overlay the
 * whole app, independent of where the triggering component lives.
 */
export function Portal(props: PortalProps) {
    const { children, containerId = 'portal-root' } = props;
    const [container, setContainer] = useState<Element | null>(null);

    useEffect(() => {
        const element = document.getElementById(containerId);
        setContainer(element);
    }, [containerId]);

    if (!container) {
        // In SSR or before the DOM node exists, render nothing.
        return null;
    }

    return createPortal(children, container);
}
