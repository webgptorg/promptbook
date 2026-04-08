import { metadataDefaults } from '../../../database/metadataDefaults';
import {
    IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
    SERVER_LANGUAGE_METADATA_KEY,
} from '../../../languages/ServerLanguageRegistry';
import { isChatFeedbackEnabled, parseChatFeedbackMode } from '../../chatFeedbackMode';
import type { CreateServerInitialSettings } from '../createManagedServer';

/**
 * Constant for boolean feature flag metadata key by field.
 */
const BOOLEAN_FEATURE_FLAG_METADATA_KEY_BY_FIELD = {
    isFileAttachmentsEnabled: 'IS_FILE_ATTACHEMENTS_ENABLED',
    isExperimentalPwaAppEnabled: 'IS_EXPERIMENTAL_PWA_APP_ENABLED',
    isFooterShown: 'IS_FOOTER_SHOWN',
} as const;

/**
 * One metadata row inserted during server bootstrap.
 *
 * @private type of createManagedServer
 */
export type ServerMetadataSeedEntry = {
    /**
     * Metadata key.
     */
    readonly key: string;

    /**
     * Metadata value.
     */
    readonly value: string;

    /**
     * Optional metadata note copied from defaults.
     */
    readonly note: string | null;
};

/**
 * Normalized metadata inputs used during bootstrap seeding.
 */
type BuildServerMetadataSeedEntriesOptions = {
    /**
     * Friendly unique server name.
     */
    readonly name: string;

    /**
     * Default UI language for the new server.
     */
    readonly language: string;

    /**
     * Normalized homepage markdown message.
     */
    readonly homepageMessage: string;

    /**
     * Optional uploaded server icon URL.
     */
    readonly iconUrl: string | null;

    /**
     * Raw initial settings from the create-server wizard.
     */
    readonly initialSettings: CreateServerInitialSettings;
};

/**
 * Builds metadata rows inserted during create-server bootstrap.
 *
 * @param options - Normalized metadata inputs from the wizard.
 * @returns Metadata seed rows.
 *
 * @private function of createManagedServer
 */
export function buildServerMetadataSeedEntries(
    options: BuildServerMetadataSeedEntriesOptions,
): ReadonlyArray<ServerMetadataSeedEntry> {
    const feedbackMode = parseChatFeedbackMode(
        options.initialSettings.feedbackMode,
        resolveLegacyFeedbackEnabled(options.initialSettings.isFeedbackEnabled),
    );
    const entries: Array<ServerMetadataSeedEntry> = [
        createMetadataSeedEntry('SERVER_NAME', options.name),
        createMetadataSeedEntry(SERVER_LANGUAGE_METADATA_KEY, options.language),
        createMetadataSeedEntry(IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY, 'false'),
        createMetadataSeedEntry('CHAT_FEEDBACK_MODE', feedbackMode),
        createMetadataSeedEntry('IS_FEEDBACK_ENABLED', isChatFeedbackEnabled(feedbackMode) ? 'true' : 'false'),
    ];

    if (options.homepageMessage !== '') {
        entries.push(createMetadataSeedEntry('HOMEPAGE_MESSAGE', options.homepageMessage));
    }

    if (options.iconUrl) {
        entries.push(createMetadataSeedEntry('SERVER_LOGO_URL', options.iconUrl));
        entries.push(createMetadataSeedEntry('SERVER_FAVICON_URL', options.iconUrl));
    }

    for (const [fieldName, metadataKey] of Object.entries(BOOLEAN_FEATURE_FLAG_METADATA_KEY_BY_FIELD)) {
        const fieldValue =
            options.initialSettings[fieldName as keyof typeof BOOLEAN_FEATURE_FLAG_METADATA_KEY_BY_FIELD];
        entries.push(createMetadataSeedEntry(metadataKey, fieldValue ? 'true' : 'false'));
    }

    return entries;
}

/**
 * Converts the deprecated feedback toggle into the legacy string expected by `parseChatFeedbackMode`.
 *
 * @param isFeedbackEnabled - Legacy boolean from older create-server payloads.
 * @returns Legacy string representation or `null`.
 */
function resolveLegacyFeedbackEnabled(isFeedbackEnabled: boolean | undefined): string | null {
    if (typeof isFeedbackEnabled !== 'boolean') {
        return null;
    }

    return isFeedbackEnabled ? 'true' : 'false';
}

/**
 * Creates one metadata seed row while copying the default note when available.
 *
 * @param key - Metadata key to insert.
 * @param value - Metadata value to insert.
 * @returns Metadata seed entry.
 */
function createMetadataSeedEntry(key: string, value: string): ServerMetadataSeedEntry {
    const defaultEntry = metadataDefaults.find((candidate) => candidate.key === key);

    return {
        key,
        value,
        note: defaultEntry?.note ?? null,
    };
}
