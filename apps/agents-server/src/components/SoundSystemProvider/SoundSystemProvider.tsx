'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { createDefaultSoundSystem } from '../../utils/sound/createDefaultSoundSystem';
import type { ChatSoundSystem } from '@promptbook-local/components';

type SoundSystemContextValue = {
    readonly soundSystem?: ChatSoundSystem;
};

const SoundSystemContext = createContext<SoundSystemContextValue>({ soundSystem: undefined });

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
