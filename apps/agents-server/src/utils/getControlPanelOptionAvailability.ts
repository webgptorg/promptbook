import { IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY, parseServerLanguageEnforcedMetadata } from '../languages/ServerLanguageRegistry';

/**
 * Availability map consumed by the Agents Server control panel UI.
 */
export type ControlPanelOptionAvailability = {
    readonly sound: boolean;
    readonly vibration: boolean;
    readonly notifications: boolean;
    readonly selfLearning: boolean;
    readonly privateMode: boolean;
    readonly language: boolean;
    readonly chatVisualMode: boolean;
};

/**
 * Explicit metadata keys that can hide individual control-panel options for one server.
 */
const CONTROL_PANEL_OPTION_METADATA_KEY_MAP: Record<keyof ControlPanelOptionAvailability, string> = {
    sound: 'IS_CONTROL_PANEL_SOUND_ENABLED',
    vibration: 'IS_CONTROL_PANEL_VIBRATION_ENABLED',
    notifications: 'IS_CONTROL_PANEL_NOTIFICATIONS_ENABLED',
    selfLearning: 'IS_CONTROL_PANEL_SELF_LEARNING_ENABLED',
    privateMode: 'IS_CONTROL_PANEL_PRIVATE_MODE_ENABLED',
    language: 'IS_CONTROL_PANEL_LANGUAGE_ENABLED',
    chatVisualMode: 'IS_CONTROL_PANEL_CHAT_VISUAL_MODE_ENABLED',
};

/**
 * Metadata keys required to resolve control-panel option availability.
 */
export const CONTROL_PANEL_OPTION_AVAILABILITY_METADATA_KEYS = [
    ...Object.values(CONTROL_PANEL_OPTION_METADATA_KEY_MAP),
    IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
] as const;

/**
 * Parameters accepted by `getControlPanelOptionAvailability`.
 */
type GetControlPanelOptionAvailabilityOptions = {
    /**
     * Metadata values already loaded for the current server.
     */
    readonly metadata: Record<string, string | null | undefined>;
    /**
     * Indicates whether browser push notifications are configured for this server runtime.
     */
    readonly isPushNotificationsConfigured: boolean;
};

/**
 * Parses one metadata boolean with a stable fallback.
 *
 * @param value - Raw metadata value.
 * @param fallback - Value used when metadata is missing or invalid.
 * @returns Parsed boolean availability flag.
 */
function parseBooleanMetadata(value: string | null | undefined, fallback: boolean): boolean {
    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    return fallback;
}

/**
 * Resolves the server-specific availability of every control-panel option from metadata.
 *
 * @param options - Resolution inputs for the current server.
 * @param options.metadata - Metadata values already loaded for the current server.
 * @param options.isPushNotificationsConfigured - Whether browser push delivery is configured in runtime env.
 * @returns One normalized availability map shared across control-panel groups.
 *
 * @public exported from `apps/agents-server`
 */
export function getControlPanelOptionAvailability({
    metadata,
    isPushNotificationsConfigured,
}: GetControlPanelOptionAvailabilityOptions): ControlPanelOptionAvailability {
    const isServerLanguageEnforced = parseServerLanguageEnforcedMetadata(metadata[IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY]);

    return {
        sound: parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.sound], true),
        vibration: parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.vibration], true),
        notifications:
            parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.notifications], true) &&
            isPushNotificationsConfigured,
        selfLearning: parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.selfLearning], true),
        privateMode: parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.privateMode], true),
        language:
            parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.language], true) && !isServerLanguageEnforced,
        chatVisualMode: parseBooleanMetadata(metadata[CONTROL_PANEL_OPTION_METADATA_KEY_MAP.chatVisualMode], true),
    };
}
