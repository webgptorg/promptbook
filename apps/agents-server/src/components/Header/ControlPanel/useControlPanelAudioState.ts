'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';
import type { ControlPanelSoundSystem } from './ControlPanelContentState';

/**
 * Arguments accepted by the shared local toggle-state hook.
 *
 * @private function of ControlPanelContent
 */
type UseControlPanelBooleanToggleProps = {
    readonly isAvailable: boolean;
    readonly resolveValue: () => boolean;
    readonly toggleValue: () => boolean;
};

/**
 * Local reactive state for one external boolean preference.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelBooleanToggleState = {
    readonly isEnabled: boolean;
    readonly toggle: () => void;
};

/**
 * Audio-specific toggle state returned to `useControlPanelContentState`.
 *
 * @private function of ControlPanelContent
 */
type UseControlPanelAudioStateResult = {
    readonly soundSystem: ControlPanelSoundSystem;
    readonly isVibrationSupported: boolean;
    readonly soundToggle: ControlPanelBooleanToggleState;
    readonly vibrationToggle: ControlPanelBooleanToggleState;
};

/**
 * Resolves reactive sound and vibration toggle state for `useControlPanelContentState`.
 *
 * @private function of ControlPanelContent
 */
export function useControlPanelAudioState(): UseControlPanelAudioStateResult {
    const { soundSystem } = useSoundSystem();
    const isVibrationSupported = isControlPanelVibrationSupported(soundSystem);

    const soundToggle = useControlPanelBooleanToggle({
        isAvailable: Boolean(soundSystem),
        resolveValue: useCallback(() => soundSystem?.isEnabled() ?? false, [soundSystem]),
        toggleValue: useCallback(() => soundSystem?.toggle() ?? false, [soundSystem]),
    });

    const vibrationToggle = useControlPanelBooleanToggle({
        isAvailable: isVibrationSupported,
        resolveValue: useCallback(() => soundSystem?.isVibrationEnabled?.() ?? false, [soundSystem]),
        toggleValue: useCallback(() => toggleControlPanelVibration(soundSystem), [soundSystem]),
    });

    return { soundSystem, isVibrationSupported, soundToggle, vibrationToggle };
}

/**
 * Bridges mutable external boolean preferences (sound/vibration) into React state.
 *
 * @private function of ControlPanelContent
 */
function useControlPanelBooleanToggle({
    isAvailable,
    resolveValue,
    toggleValue,
}: UseControlPanelBooleanToggleProps): ControlPanelBooleanToggleState {
    const [isEnabled, setIsEnabled] = useState<boolean>(() => (isAvailable ? resolveValue() : false));

    useEffect(() => {
        setIsEnabled(isAvailable ? resolveValue() : false);
    }, [isAvailable, resolveValue]);

    const toggle = useCallback(() => {
        if (!isAvailable) {
            return;
        }

        const nextValue = toggleValue();
        setIsEnabled(nextValue);
    }, [isAvailable, toggleValue]);

    return { isEnabled, toggle };
}

/**
 * Determines whether the active sound system exposes vibration controls.
 *
 * @private function of ControlPanelContent
 */
function isControlPanelVibrationSupported(soundSystem: ControlPanelSoundSystem): boolean {
    return (
        typeof soundSystem?.isVibrationEnabled === 'function' &&
        (typeof soundSystem.toggleVibration === 'function' || typeof soundSystem.setVibrationEnabled === 'function')
    );
}

/**
 * Toggles vibration using whichever sound-system API is available.
 *
 * @private function of ControlPanelContent
 */
function toggleControlPanelVibration(soundSystem: ControlPanelSoundSystem): boolean {
    if (typeof soundSystem?.toggleVibration === 'function') {
        return soundSystem.toggleVibration();
    }

    if (
        typeof soundSystem?.isVibrationEnabled === 'function' &&
        typeof soundSystem.setVibrationEnabled === 'function'
    ) {
        const nextState = !soundSystem.isVibrationEnabled();
        soundSystem.setVibrationEnabled(nextState);
        return nextState;
    }

    return false;
}
