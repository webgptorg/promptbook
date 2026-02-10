'use client';

import { useEffect } from 'react';
import { initializeSoundPreferences } from '@/utils/sound/preferences';

/**
 * Props for `SoundPreferencesInitializer`.
 */
export type SoundPreferencesInitializerProps = {
    /** Default state for chat sounds when no local preference exists. */
    readonly defaultIsSoundsOn?: boolean;
    /** Default state for vibration feedback when no local preference exists. */
    readonly defaultIsVibrationOn?: boolean;
};

/**
 * Initializes the shared sound preferences store with server-provided defaults.
 */
export function SoundPreferencesInitializer(props: SoundPreferencesInitializerProps) {
    const { defaultIsSoundsOn = false, defaultIsVibrationOn = true } = props;

    useEffect(() => {
        initializeSoundPreferences({
            isSoundsEnabled: defaultIsSoundsOn,
            isVibrationEnabled: defaultIsVibrationOn,
        });
    }, [defaultIsSoundsOn, defaultIsVibrationOn]);

    return null;
}
