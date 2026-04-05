'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { ControlPanelOptionAvailability } from '../../utils/getControlPanelOptionAvailability';

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
    /**
     * Server-specific visibility of each control-panel option.
     */
    readonly controlPanelOptionAvailability: ControlPanelOptionAvailability;
};

/**
 * Control-panel availability defaults used before server metadata is provided.
 *
 * @private
 */
const defaultControlPanelOptionAvailability: ControlPanelOptionAvailability = {
    sound: true,
    vibration: true,
    notifications: true,
    selfLearning: true,
    privateMode: true,
    language: true,
    chatVisualMode: true,
};

/**
 * Default metadata flags applied when the server does not override them.
 *
 * @private
 */
const defaultMetadataFlags: MetadataFlags = {
    isExperimentalPwaAppEnabled: true,
    controlPanelOptionAvailability: defaultControlPanelOptionAvailability,
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
