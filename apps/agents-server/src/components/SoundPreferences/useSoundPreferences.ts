'use client';

import { useSyncExternalStore } from 'react';
import { getSoundPreferences, subscribeToSoundPreferences } from '@/utils/sound/preferences';
import type { SoundPreferences } from '@/utils/sound/preferences';

/**
 * React hook that returns the latest sound/vibration preference snapshot.
 */
export function useSoundPreferences(): SoundPreferences {
    return useSyncExternalStore(subscribeToSoundPreferences, getSoundPreferences, getSoundPreferences);
}
