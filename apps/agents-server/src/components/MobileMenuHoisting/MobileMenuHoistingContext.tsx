'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SubMenuItem } from '../Header/SubMenuItem';

/**
 * Context contract for mobile-only menu items hoisted into the shared header drawer.
 */
type MobileMenuHoistingContextValue = {
    /**
     * Page-specific mobile menu entries currently registered for the active route.
     */
    readonly items: ReadonlyArray<SubMenuItem>;
    /**
     * Replaces the currently hoisted mobile menu entries.
     */
    readonly setItems: (items: ReadonlyArray<SubMenuItem>) => void;
};

const MobileMenuHoistingContext = createContext<MobileMenuHoistingContextValue | null>(null);

/**
 * Provides route-level mobile drawer item hoisting for the Agents Server shell.
 */
export function MobileMenuHoistingProvider({ children }: { readonly children: ReactNode }) {
    const [items, setItemsState] = useState<ReadonlyArray<SubMenuItem>>([]);
    const value = useMemo<MobileMenuHoistingContextValue>(
        () => ({
            items,
            setItems: (nextItems) => {
                setItemsState([...nextItems]);
            },
        }),
        [items],
    );

    return <MobileMenuHoistingContext.Provider value={value}>{children}</MobileMenuHoistingContext.Provider>;
}

/**
 * Returns the mobile drawer hoisting API when rendered inside the shared layout shell.
 */
export function useMobileMenuHoisting() {
    return useContext(MobileMenuHoistingContext);
}

/**
 * Hoists route-specific mobile drawer items into the shared header while the caller is mounted.
 *
 * @param items - Mobile-only menu entries contributed by the current route.
 */
export function useHoistedMobileMenuItems(items: ReadonlyArray<SubMenuItem>) {
    const mobileMenuHoisting = useMobileMenuHoisting();

    useEffect(() => {
        if (!mobileMenuHoisting) {
            return;
        }

        mobileMenuHoisting.setItems(items);

        return () => {
            mobileMenuHoisting.setItems([]);
        };
    }, [items, mobileMenuHoisting]);
}
