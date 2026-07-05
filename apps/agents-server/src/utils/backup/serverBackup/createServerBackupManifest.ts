import {
    DEFAULT_SERVER_BACKUP_SECTION_KEYS,
    type ServerBackupSectionDefinition,
    type ServerBackupSectionKey,
} from '../serverBackupSections';

/**
 * Stable archive format identifier for the user-facing backup layout.
 *
 * @private constant of `createServerBackupZipStream`
 */
const SERVER_BACKUP_FORMAT = 'promptbook-server-backup/v2';

/**
 * High-level manifest written into every server backup ZIP.
 *
 * @private type of `createServerBackupZipStream`
 */
export type ServerBackupManifest = {
    /**
     * Stable backup archive format identifier.
     */
    readonly format: typeof SERVER_BACKUP_FORMAT;
    /**
     * ISO timestamp when the archive was generated.
     */
    readonly generatedAt: string;
    /**
     * Whether the archive includes every default exportable section.
     */
    readonly isFullBackup: boolean;
    /**
     * Ordered list of exported section keys.
     */
    readonly selectedSections: ReadonlyArray<ServerBackupSectionKey>;
    /**
     * Human-readable section details for restore/debug tooling.
     */
    readonly sections: ReadonlyArray<{
        readonly key: ServerBackupSectionKey;
        readonly label: string;
        readonly description: string;
        readonly directoryName: string;
        readonly selectionKind: ServerBackupSectionDefinition['selectionKind'];
        readonly includesBooks: boolean;
    }>;
};

/**
 * Builds the high-level manifest describing one server backup archive.
 *
 * @param options - Generation timestamp and the resolved selection.
 * @returns Manifest payload ready to serialize into `manifest.json`.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createServerBackupManifest(options: {
    generatedAt: string;
    selectedSectionKeys: ReadonlyArray<ServerBackupSectionKey>;
    selectedSectionDefinitions: ReadonlyArray<ServerBackupSectionDefinition>;
}): ServerBackupManifest {
    const { generatedAt, selectedSectionKeys, selectedSectionDefinitions } = options;

    return {
        format: SERVER_BACKUP_FORMAT,
        generatedAt,
        isFullBackup:
            selectedSectionKeys.length === DEFAULT_SERVER_BACKUP_SECTION_KEYS.length &&
            DEFAULT_SERVER_BACKUP_SECTION_KEYS.every((sectionKey, index) => selectedSectionKeys[index] === sectionKey),
        selectedSections: selectedSectionKeys,
        sections: selectedSectionDefinitions.map(
            ({ key, label, description, directoryName, selectionKind, includesBooks }) => ({
                key,
                label,
                description,
                directoryName,
                selectionKind,
                includesBooks,
            }),
        ),
    };
}
