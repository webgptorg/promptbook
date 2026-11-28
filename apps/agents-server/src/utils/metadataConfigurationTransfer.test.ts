import { describe, expect, it } from '@jest/globals';
import { DEFAULT_THEME_METADATA_KEY } from '../constants/themeMode';
import { getMetadataDefinition } from '../database/metadataDefaults';
import {
    createMetadataConfigurationExportFilename,
    createMetadataConfigurationExportPayload,
    createMetadataConfigurationImportPlan,
} from './metadataConfigurationTransfer';

describe('metadataConfigurationTransfer', () => {
    it('exports only metadata fields that differ from defaults', () => {
        const serverNameDefinition = getMetadataDefinition('SERVER_NAME')!;
        const serverDescriptionDefinition = getMetadataDefinition('SERVER_DESCRIPTION')!;
        const serverLanguageDefinition = getMetadataDefinition('SERVER_LANGUAGE')!;
        const adminEmailDefinition = getMetadataDefinition('ADMIN_EMAIL')!;

        const payload = createMetadataConfigurationExportPayload(
            [
                {
                    key: 'SERVER_NAME',
                    value: 'Configured Promptbook',
                    note: serverNameDefinition.note,
                },
                {
                    key: 'SERVER_DESCRIPTION',
                    value: serverDescriptionDefinition.value,
                    note: 'Custom description note',
                },
                {
                    key: 'SERVER_LANGUAGE',
                    value: serverLanguageDefinition.value,
                    note: serverLanguageDefinition.note,
                },
                {
                    key: 'ADMIN_EMAIL',
                    value: adminEmailDefinition.value,
                    note: null,
                },
                {
                    key: 'CUSTOM_METADATA',
                    value: 'custom value',
                    note: null,
                },
            ],
            '0.0.0-test',
        );

        expect(payload.promptbookVersion).toBe('0.0.0-test');
        expect(payload.metadata).toEqual([
            {
                key: 'ADMIN_EMAIL',
                note: null,
            },
            {
                key: 'CUSTOM_METADATA',
                value: 'custom value',
            },
            {
                key: 'SERVER_DESCRIPTION',
                note: 'Custom description note',
            },
            {
                key: 'SERVER_NAME',
                value: 'Configured Promptbook',
            },
        ]);
    });

    it('imports omitted values and notes from defaults', () => {
        const serverDescriptionDefinition = getMetadataDefinition('SERVER_DESCRIPTION')!;
        const importPlan = createMetadataConfigurationImportPlan({
            promptbookVersion: '0.0.0-test',
            metadata: [
                {
                    key: 'SERVER_NAME',
                    value: 'Configured Promptbook',
                },
                {
                    key: 'SERVER_DESCRIPTION',
                    note: 'Custom description note',
                },
                {
                    key: 'CUSTOM_METADATA',
                    value: 'custom value',
                },
            ],
        });

        expect(importPlan.rowsToUpsert).toEqual([
            {
                key: 'CUSTOM_METADATA',
                value: 'custom value',
                note: null,
            },
            {
                key: 'SERVER_DESCRIPTION',
                value: serverDescriptionDefinition.value,
                note: 'Custom description note',
            },
            {
                key: 'SERVER_NAME',
                value: 'Configured Promptbook',
                note: getMetadataDefinition('SERVER_NAME')!.note,
            },
        ]);
        expect(importPlan.defaultKeysToReset).toContain('SERVER_LANGUAGE');
        expect(importPlan.defaultKeysToReset).not.toContain('SERVER_NAME');
    });

    it('can import selected metadata without resetting omitted defaults', () => {
        const importPlan = createMetadataConfigurationImportPlan(
            {
                promptbookVersion: '0.0.0-test',
                metadata: [
                    {
                        key: 'SERVER_NAME',
                        value: 'Imported Promptbook',
                    },
                ],
            },
            { isDefaultResetSkipped: true },
        );

        expect(importPlan.rowsToUpsert).toEqual([
            {
                key: 'SERVER_NAME',
                value: 'Imported Promptbook',
                note: getMetadataDefinition('SERVER_NAME')!.note,
            },
        ]);
        expect(importPlan.defaultKeysToReset).toEqual([]);
    });

    it('rejects invalid enum metadata values during import', () => {
        expect(() =>
            createMetadataConfigurationImportPlan({
                promptbookVersion: '0.0.0-test',
                metadata: [
                    {
                        key: DEFAULT_THEME_METADATA_KEY,
                        value: 'SEPIA',
                    },
                ],
            }),
        ).toThrow(`Unsupported value for \`${DEFAULT_THEME_METADATA_KEY}\``);
    });

    it('creates server-name based metadata filenames', () => {
        expect(createMetadataConfigurationExportFilename('Český Promptbook Server!')).toBe(
            'cesky-promptbook-server.metadata.json',
        );
        expect(createMetadataConfigurationExportFilename('   ')).toBe('promptbook-agents-server.metadata.json');
    });
});
