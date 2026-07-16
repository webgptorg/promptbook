import { describe, expect, it } from '@jest/globals';
import { resolveBinaryCitationBytesLabel, resolveStaticCitationSourceLabel } from './resolveStaticCitationSourceLabel';

describe('resolveStaticCitationSourceLabel', () => {
    it('prefers explicit citation titles', () => {
        expect(
            resolveStaticCitationSourceLabel({
                source: 'https://example.com/raw-source',
                title: 'Readable Source Title',
            }),
        ).toBe('Readable Source Title');
    });

    it('extracts readable labels from GitHub repository JSON arrays', () => {
        const source = `\uD83C\uDF10${JSON.stringify([
            {
                id: 1239608413,
                node_id: 'R_kgDOSeLsXQ',
                name: 'ai-supervize-2026-05-15',
                full_name: 'hejny/ai-supervize-2026-05-15',
                description: 'AI supervision prototype',
            },
            {
                id: 1239608414,
                node_id: 'R_kgDOSeLsXR',
                name: 'promptbook',
                full_name: 'webgptorg/promptbook',
            },
        ])}`;

        expect(resolveStaticCitationSourceLabel({ source })).toBe(
            'GitHub - hejny/ai-supervize-2026-05-15: AI supervision prototype + 1 more',
        );
    });

    it('extracts labels from package-style JSON objects', () => {
        expect(
            resolveStaticCitationSourceLabel({
                source: JSON.stringify({
                    _id: '@heduapp/playground',
                    _rev: '27-5e68acbe30a0dda0d00779',
                }),
            }),
        ).toBe('@heduapp/playground');
    });

    it('labels decoded JPEG binary sources instead of returning unreadable characters', () => {
        expect(
            resolveStaticCitationSourceLabel({
                source: '\uFFFD\uFFFD\uFFFD\uFFFD\u0010JFIF\u0001\u0001\u0001\u0001',
            }),
        ).toBe('JPEG image');
    });

    it('returns null for ordinary source labels so the shared fallback can handle them', () => {
        expect(resolveStaticCitationSourceLabel({ source: 'annual-report-2026.pdf' })).toBeNull();
    });
});

describe('resolveBinaryCitationBytesLabel', () => {
    it('labels fetched JPEG bytes before they are decoded as text', () => {
        expect(resolveBinaryCitationBytesLabel(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(
            'JPEG image',
        );
    });

    it('does not hide PDF metadata extraction behind a generic content-type label', () => {
        expect(resolveBinaryCitationBytesLabel(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 'application/pdf')).toBe(
            'PDF document',
        );
    });
});
