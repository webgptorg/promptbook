'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Shared state for injecting page-specific entries into the mobile header drawer.
 *
 * @private internal helper of Agents Server header navigation
 */
type MobileMenuHoistingContextValue = {
    /**
     * Entries rendered in the hoisted section of the mobile drawer.
     */
    readonly menuItems: Array<SubMenuItem>;
    /**
     * Replaces hoisted mobile entries with a new set.
     */
    readonly setMenuItems: (items: Array<SubMenuItem>) => void;
};

/**
 * Constant for mobile menu hoisting context.
 */
const MobileMenuHoistingContext = createContext<MobileMenuHoistingContextValue | null>(null);

/**
 * Provides mobile drawer hoisting state to the app shell.
 *
 * @private internal provider of Agents Server mobile navigation
 */
export function MobileMenuHoistingProvider({ children }: { readonly children: ReactNode }) {
    const [menuItems, setMenuItems] = useState<Array<SubMenuItem>>([]);

    return (
        <MobileMenuHoistingContext.Provider
            value={{
                menuItems,
                setMenuItems,
            }}
        >
            {children}
        </MobileMenuHoistingContext.Provider>
    );
}

/**
 * Resolves the mobile drawer hoisting context.
 *
 * @private internal hook of Agents Server mobile navigation
 */
export function useMobileMenuHoisting() {
    return useContext(MobileMenuHoistingContext);
}

/**
 * Hoists one page-specific mobile menu subtree into the shared header drawer.
 *
 * @private internal hook for route-level mobile menu integration
 */
export function useHoistedMobileMenuItems(items: ReadonlyArray<SubMenuItem>) {
    const mobileMenuHoisting = useMobileMenuHoisting();

    useEffect(() => {
        if (!mobileMenuHoisting) {
            return;
        }

        mobileMenuHoisting.setMenuItems([...items]);

        return () => {
            mobileMenuHoisting.setMenuItems([]);
        };
    }, [items, mobileMenuHoisting]);
}
