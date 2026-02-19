'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/**
 * Flags derived from server metadata that control optional client flows.
 *
 * @private
 */
export type MetadataFlags = {
    /**
     * Controls whether the experimental install-app option surfaces in agent menus.
     */
    readonly isExperimentalPwaAppEnabled: boolean;
};

/**
 * Default metadata flags applied when the server does not override them.
 *
 * @private
 */
const defaultMetadataFlags: MetadataFlags = {
    isExperimentalPwaAppEnabled: true,
};

/**
 * React context storing the current metadata flags.
 *
 * @private
 */
const MetadataFlagsContext = createContext<MetadataFlags>(defaultMetadataFlags);

/**
 * Properties accepted by `MetadataFlagsProvider`.
 *
 * @private
 */
type MetadataFlagsProviderProps = {
    /**
     * Flag values derived from server metadata.
     */
    readonly value: MetadataFlags;
    /**
     * Children that can read the flags.
     */
    readonly children: ReactNode;
};

/**
 * Supplies metadata-driven flags to client components.
 *
 * @param props - Provider properties.
 * @param props.value - Flags derived from server metadata.
 * @param props.children - Descendent components that can read the flags.
 * @private
 */
export function MetadataFlagsProvider({ value, children }: MetadataFlagsProviderProps) {
    return <MetadataFlagsContext.Provider value={value}>{children}</MetadataFlagsContext.Provider>;
}

/**
 * Returns the metadata flags for the current layout tree.
 *
 * @returns Metadata flags exposed by `MetadataFlagsProvider`.
 * @private
 */
export function useMetadataFlags(): MetadataFlags {
    return useContext(MetadataFlagsContext);
}
