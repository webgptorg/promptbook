'use client';

import { confirmPrivateModeEnable } from '../../PrivateModePreferences/confirmPrivateModeEnable';
import type { ControlPanelTranslator } from './ControlPanelContentState';

/**
 * Arguments accepted by the private-mode toggle helper.
 *
 * @private function of ControlPanelContent
 */
type ToggleControlPanelPrivateModeProps = {
    readonly isPrivateModeEnabled: boolean;
    readonly setIsPrivateModeEnabled: (isEnabled: boolean) => void;
    readonly t: ControlPanelTranslator;
};

/**
 * Prompts once before enabling private mode and disables it immediately when toggled off.
 *
 * @private function of ControlPanelContent
 */
export async function toggleControlPanelPrivateMode({
    isPrivateModeEnabled,
    setIsPrivateModeEnabled,
    t,
}: ToggleControlPanelPrivateModeProps) {
    if (isPrivateModeEnabled) {
        setIsPrivateModeEnabled(false);
        return;
    }

    const isConfirmed = await confirmPrivateModeEnable(t);
    if (!isConfirmed) {
        return;
    }

    setIsPrivateModeEnabled(true);
}
