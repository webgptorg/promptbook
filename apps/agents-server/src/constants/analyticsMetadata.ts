import { MetadataType } from './metadataTypes';

/**
 * Metadata key for the Google Analytics measurement ID.
 * @private
 */
export const ANALYTICS_GOOGLE_MEASUREMENT_ID_KEY = 'ANALYTICS_GOOGLE_MEASUREMENT_ID';

/**
 * Metadata key that controls whether Google Analytics automatically records page views.
 * @private
 */
export const ANALYTICS_GOOGLE_AUTO_PAGEVIEW_KEY = 'ANALYTICS_GOOGLE_AUTO_PAGEVIEW';

/**
 * Metadata key toggling IP anonymization inside Google Analytics.
 * @private
 */
export const ANALYTICS_GOOGLE_ANONYMIZE_IP_KEY = 'ANALYTICS_GOOGLE_ANONYMIZE_IP';

/**
 * Metadata key that exposes the allow_ad_personalization_signals flag for gtag.js.
 * @private
 */
export const ANALYTICS_GOOGLE_ALLOW_AD_PERSONALIZATION_KEY =
    'ANALYTICS_GOOGLE_ALLOW_AD_PERSONALIZATION';

/**
 * Metadata key for the Smartsapp workspace identifier.
 * @private
 */
export const ANALYTICS_SMARTSAPP_WORKSPACE_ID_KEY = 'ANALYTICS_SMARTSAPP_WORKSPACE_ID';

/**
 * Metadata key that controls Smartsapp automatic page view tracking.
 * @private
 */
export const ANALYTICS_SMARTSAPP_AUTO_PAGEVIEW_KEY = 'ANALYTICS_SMARTSAPP_AUTO_PAGEVIEW';

/**
 * Metadata key for toggling Smartsapp error/session captures.
 * @private
 */
export const ANALYTICS_SMARTSAPP_CAPTURE_ERRORS_KEY = 'ANALYTICS_SMARTSAPP_CAPTURE_ERRORS';

/**
 * Ordered list of analytics metadata keys that drive the built-in integrations.
 * @private
 */
export const ANALYTICS_METADATA_KEYS = [
    ANALYTICS_GOOGLE_MEASUREMENT_ID_KEY,
    ANALYTICS_GOOGLE_AUTO_PAGEVIEW_KEY,
    ANALYTICS_GOOGLE_ANONYMIZE_IP_KEY,
    ANALYTICS_GOOGLE_ALLOW_AD_PERSONALIZATION_KEY,
    ANALYTICS_SMARTSAPP_WORKSPACE_ID_KEY,
    ANALYTICS_SMARTSAPP_AUTO_PAGEVIEW_KEY,
    ANALYTICS_SMARTSAPP_CAPTURE_ERRORS_KEY,
] as const;

/**
 * Union over the supported analytics metadata keys.
 * @private
 */
export type AnalyticsMetadataKey = (typeof ANALYTICS_METADATA_KEYS)[number];

type AnalyticsMetadataDefinition = {
    type: MetadataType;
    defaultValue: string;
    note: string;
};

const analyticsMetadataDefinitions: Record<AnalyticsMetadataKey, AnalyticsMetadataDefinition> = {
    [ANALYTICS_GOOGLE_MEASUREMENT_ID_KEY]: {
        type: 'TEXT_SINGLE_LINE',
        defaultValue: '',
        note: 'Google Analytics measurement ID (G-XXXX) used by gtag.js.',
    },
    [ANALYTICS_GOOGLE_AUTO_PAGEVIEW_KEY]: {
        type: 'BOOLEAN',
        defaultValue: 'true',
        note: 'Automatically send page view events when gtag.js loads.',
    },
    [ANALYTICS_GOOGLE_ANONYMIZE_IP_KEY]: {
        type: 'BOOLEAN',
        defaultValue: 'false',
        note: 'Anonymize visitor IPs before sending data to Google Analytics.',
    },
    [ANALYTICS_GOOGLE_ALLOW_AD_PERSONALIZATION_KEY]: {
        type: 'BOOLEAN',
        defaultValue: 'true',
        note: 'Allow Google to use ad personalization signals when enabled.',
    },
    [ANALYTICS_SMARTSAPP_WORKSPACE_ID_KEY]: {
        type: 'TEXT_SINGLE_LINE',
        defaultValue: '',
        note: 'Workspace identifier required by the Smartsapp JavaScript SDK.',
    },
    [ANALYTICS_SMARTSAPP_AUTO_PAGEVIEW_KEY]: {
        type: 'BOOLEAN',
        defaultValue: 'true',
        note: 'Automatically fire page view events through Smartsapp.',
    },
    [ANALYTICS_SMARTSAPP_CAPTURE_ERRORS_KEY]: {
        type: 'BOOLEAN',
        defaultValue: 'true',
        note: 'Capture front-end errors via the Smartsapp SDK.',
    },
};

/**
 * Runtime representation of the curated analytics configuration.
 * @private
 */
export type AnalyticsSettings = {
    googleMeasurementId: string;
    googleAutoPageView: boolean;
    googleAnonymizeIp: boolean;
    googleAdPersonalization: boolean;
    smartsappWorkspaceId: string;
    smartsappAutoPageView: boolean;
    smartsappCaptureErrors: boolean;
};

/**
 * Default analytics settings mirroring the metadata defaults.
 * @private
 */
export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
    googleMeasurementId: '',
    googleAutoPageView: true,
    googleAnonymizeIp: false,
    googleAdPersonalization: true,
    smartsappWorkspaceId: '',
    smartsappAutoPageView: true,
    smartsappCaptureErrors: true,
};

/**
 * Converts a metadata flag into a boolean while falling back to a provided default.
 * @private
 */
export function parseBooleanFlag(value: string | null | undefined, fallback: boolean): boolean {
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return fallback;
}

/**
 * Serializes a boolean into the stored metadata string.
 * @private
 */
export function formatBooleanFlag(value: boolean): 'true' | 'false' {
    return value ? 'true' : 'false';
}

/**
 * Builds the runtime analytics settings from metadata values.
 * @private
 */
export function mapMetadataToAnalyticsSettings(
    metadata: Record<string, string | null | undefined>,
): AnalyticsSettings {
    const getValue = (key: AnalyticsMetadataKey) => metadata[key] ?? '';
    return {
        googleMeasurementId: (getValue(ANALYTICS_GOOGLE_MEASUREMENT_ID_KEY) as string).trim(),
        googleAutoPageView: parseBooleanFlag(
            metadata[ANALYTICS_GOOGLE_AUTO_PAGEVIEW_KEY],
            DEFAULT_ANALYTICS_SETTINGS.googleAutoPageView,
        ),
        googleAnonymizeIp: parseBooleanFlag(
            metadata[ANALYTICS_GOOGLE_ANONYMIZE_IP_KEY],
            DEFAULT_ANALYTICS_SETTINGS.googleAnonymizeIp,
        ),
        googleAdPersonalization: parseBooleanFlag(
            metadata[ANALYTICS_GOOGLE_ALLOW_AD_PERSONALIZATION_KEY],
            DEFAULT_ANALYTICS_SETTINGS.googleAdPersonalization,
        ),
        smartsappWorkspaceId: (getValue(ANALYTICS_SMARTSAPP_WORKSPACE_ID_KEY) as string).trim(),
        smartsappAutoPageView: parseBooleanFlag(
            metadata[ANALYTICS_SMARTSAPP_AUTO_PAGEVIEW_KEY],
            DEFAULT_ANALYTICS_SETTINGS.smartsappAutoPageView,
        ),
        smartsappCaptureErrors: parseBooleanFlag(
            metadata[ANALYTICS_SMARTSAPP_CAPTURE_ERRORS_KEY],
            DEFAULT_ANALYTICS_SETTINGS.smartsappCaptureErrors,
        ),
    };
}

/**
 * Converts analytics settings into metadata-friendly string values.
 * @private
 */
export function mapAnalyticsSettingsToMetadataPayload(
    settings: AnalyticsSettings,
): Record<AnalyticsMetadataKey, string> {
    return {
        [ANALYTICS_GOOGLE_MEASUREMENT_ID_KEY]: settings.googleMeasurementId.trim(),
        [ANALYTICS_GOOGLE_AUTO_PAGEVIEW_KEY]: formatBooleanFlag(settings.googleAutoPageView),
        [ANALYTICS_GOOGLE_ANONYMIZE_IP_KEY]: formatBooleanFlag(settings.googleAnonymizeIp),
        [ANALYTICS_GOOGLE_ALLOW_AD_PERSONALIZATION_KEY]: formatBooleanFlag(
            settings.googleAdPersonalization,
        ),
        [ANALYTICS_SMARTSAPP_WORKSPACE_ID_KEY]: settings.smartsappWorkspaceId.trim(),
        [ANALYTICS_SMARTSAPP_AUTO_PAGEVIEW_KEY]: formatBooleanFlag(settings.smartsappAutoPageView),
        [ANALYTICS_SMARTSAPP_CAPTURE_ERRORS_KEY]: formatBooleanFlag(settings.smartsappCaptureErrors),
    };
}

/**
 * Returns the stored metadata definition for the given analytics key.
 * @private
 */
export function getAnalyticsMetadataDefinition(key: AnalyticsMetadataKey): AnalyticsMetadataDefinition {
    return analyticsMetadataDefinitions[key];
}

/**
 * Returns the human-friendly note for an analytics metadata key.
 * @private
 */
export function getAnalyticsMetadataNote(key: AnalyticsMetadataKey): string {
    return analyticsMetadataDefinitions[key].note;
}
