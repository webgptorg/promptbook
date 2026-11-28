'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { createDefaultSoundSystem } from '../../utils/sound/createDefaultSoundSystem';
import type { ChatSoundSystem } from '@promptbook-local/components';

/**
 * Type describing sound system context value.
 */
type SoundSystemContextValue = {
    readonly soundSystem?: ChatSoundSystem;
};

/**
 * Constant for sound system context.
 */
const SoundSystemContext = createContext<SoundSystemContextValue>({ soundSystem: undefined });

/**
 * Props for sound system provider.
 */
type SoundSystemProviderProps = {
    readonly children: ReactNode;
    readonly initialIsSoundsOn?: boolean;
    readonly initialIsVibrationOn?: boolean;
};

/**
 * Provides a shared chat sound system instance to the Agents Server UI.
 *
 * @private
 */
export function SoundSystemProvider({
    children,
    initialIsSoundsOn = false,
    initialIsVibrationOn = true,
}: SoundSystemProviderProps) {
    const soundSystem = useMemo(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        return createDefaultSoundSystem({
            initialIsSoundsOn,
            initialIsVibrationOn,
        });
    }, [initialIsSoundsOn, initialIsVibrationOn]);

    return <SoundSystemContext.Provider value={{ soundSystem }}>{children}</SoundSystemContext.Provider>;
}

/**
 * Accesses the shared chat sound system instance.
 *
 * @private
 */
export function useSoundSystem() {
    return useContext(SoundSystemContext);
}
