/**
 * Metadata key controlling the default notification state for new users.
 */
const DEFAULT_IS_NOTIFICATIONS_ON_KEY = 'DEFAULT_IS_NOTIFICATIONS_ON';

/**
 * Version marker stored with persisted notification settings.
 */
const USER_PUSH_NOTIFICATION_SETTINGS_VERSION = 1 as const;

/**
 * `UserData.key` used for browser push notification preferences.
 */
const USER_PUSH_NOTIFICATION_SETTINGS_USER_DATA_KEY = 'settings:notifications';

/**
 * Persisted browser push notification settings for one user.
 */
export type UserPushNotificationSettingsRecord = {
    version: 1;
    enabled: boolean;
};

/**
 * Snapshot returned to browser clients when loading notification settings.
 */
export type UserPushNotificationSettingsSnapshot = {
    enabled: boolean;
    storedEnabled: boolean | null;
    defaultEnabled: boolean;
};

/**
 * Parses one metadata boolean with a stable fallback.
 */
function parseBooleanMetadata(raw: string | null | undefined, fallback: boolean): boolean {
    if (raw === 'true') {
        return true;
    }

    if (raw === 'false') {
        return false;
    }

    return fallback;
}

/**
 * Validates and normalizes one raw `UserData.value` notification payload.
 */
export function normalizeUserPushNotificationSettingsRecord(
    value: unknown,
): UserPushNotificationSettingsRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        version?: unknown;
        enabled?: unknown;
    };

    if (candidate.version !== USER_PUSH_NOTIFICATION_SETTINGS_VERSION) {
        return null;
    }

    if (typeof candidate.enabled !== 'boolean') {
        return null;
    }

    return {
        version: USER_PUSH_NOTIFICATION_SETTINGS_VERSION,
        enabled: candidate.enabled,
    };
}

/**
 * Loads the metadata default for browser push notifications.
 */
export async function getDefaultIsNotificationsOn(): Promise<boolean> {
    const { getMetadataMap } = await import('../database/getMetadata');
    const metadata = await getMetadataMap([DEFAULT_IS_NOTIFICATIONS_ON_KEY]);
    return parseBooleanMetadata(metadata[DEFAULT_IS_NOTIFICATIONS_ON_KEY], false);
}

/**
 * Loads persisted browser push notification settings for one user.
 */
export async function getUserPushNotificationSettingsForUser(
    userId: number,
): Promise<UserPushNotificationSettingsRecord | null> {
    const { getUserDataValue } = await import('./userData');
    const storedValue = await getUserDataValue({
        userId,
        key: USER_PUSH_NOTIFICATION_SETTINGS_USER_DATA_KEY,
    });

    return normalizeUserPushNotificationSettingsRecord(storedValue);
}

/**
 * Persists one browser push notification preference for the provided user.
 */
export async function setUserPushNotificationSettingsForUser(
    userId: number,
    enabled: boolean,
): Promise<UserPushNotificationSettingsRecord> {
    const { upsertUserDataValue } = await import('./userData');
    const record: UserPushNotificationSettingsRecord = {
        version: USER_PUSH_NOTIFICATION_SETTINGS_VERSION,
        enabled,
    };

    await upsertUserDataValue({
        userId,
        key: USER_PUSH_NOTIFICATION_SETTINGS_USER_DATA_KEY,
        value: record,
    });

    return record;
}

/**
 * Builds the full browser-facing notification snapshot for one user.
 */
export async function getUserPushNotificationSettingsSnapshotForUser(
    userId: number,
): Promise<UserPushNotificationSettingsSnapshot> {
    const [defaultEnabled, storedSettings] = await Promise.all([
        getDefaultIsNotificationsOn(),
        getUserPushNotificationSettingsForUser(userId),
    ]);

    return {
        enabled: storedSettings?.enabled ?? defaultEnabled,
        storedEnabled: storedSettings?.enabled ?? null,
        defaultEnabled,
    };
}
