import { getMetadataMap } from '../database/getMetadata';

const DEFAULT_IS_SOUNDS_ON_KEY = 'DEFAULT_IS_SOUNDS_ON';
const DEFAULT_IS_VIBRATION_ON_KEY = 'DEFAULT_IS_VIBRATION_ON';

/**
 * Chat preference defaults sourced from metadata.
 */
export type ChatPreferenceDefaults = {
    /**
     * Initial state for chat sounds when no explicit preference exists.
     */
    readonly defaultIsSoundsOn: boolean;
    /**
     * Initial state for chat vibration when no explicit preference exists.
     */
    readonly defaultIsVibrationOn: boolean;
};

function parseBooleanMetadata(raw: string | null, fallback: boolean): boolean {
    if (raw === 'true') {
        return true;
    }
    if (raw === 'false') {
        return false;
    }
    return fallback;
}

/**
 * Reads the default chat sound and vibration preferences from metadata.
 *
 * These defaults are used when a browser session does not yet have saved settings.
 *
 * @returns Defaults for sounds and vibration.
 *
 * @public exported from `apps/agents-server`
 */
export async function getDefaultChatPreferences(): Promise<ChatPreferenceDefaults> {
    const config = await getMetadataMap([DEFAULT_IS_SOUNDS_ON_KEY, DEFAULT_IS_VIBRATION_ON_KEY]);
    const rawSounds = config[DEFAULT_IS_SOUNDS_ON_KEY];
    const rawVibration = config[DEFAULT_IS_VIBRATION_ON_KEY];

    return {
        defaultIsSoundsOn: parseBooleanMetadata(rawSounds, false),
        defaultIsVibrationOn: parseBooleanMetadata(rawVibration, true),
    };
}
