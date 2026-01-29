import { describe, expect, it } from '@jest/globals';
import { normalizeUploadFilename } from './normalizeUploadFilename';

describe('normalizeUploadFilename', () => {
    it('normalizes names and keeps the extension', () => {
        expect(normalizeUploadFilename('SS 2_2023 - Informace 106.pdf')).toBe('ss-2-2023-informace-106.pdf');
    });

    it('lowercases extensions and removes directory segments', () => {
        expect(normalizeUploadFilename('C:\\Temp\\My File.PNG')).toBe('my-file.png');
    });

    it('handles filenames without extensions', () => {
        expect(normalizeUploadFilename('Project Plan 2025')).toBe('project-plan-2025');
    });
});
