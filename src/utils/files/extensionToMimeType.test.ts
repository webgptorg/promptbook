import { describe, expect, it } from '@jest/globals';
import { extensionToMimeType } from './extensionToMimeType';

describe('how `extensionToMimeType` works', () => {
    it('should work with various exemples', () => {
        expect(extensionToMimeType('exe')).toBe('application/x-msdos-program');
        expect(extensionToMimeType('pdf')).toBe('application/pdf');
        expect(extensionToMimeType('docx')).toBe(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        expect(extensionToMimeType('doc')).toBe('application/msword');
        expect(extensionToMimeType('jpeg')).toBe('image/jpeg');
        expect(extensionToMimeType('jpg')).toBe('image/jpeg');
        expect(extensionToMimeType('png')).toBe('image/png');
        expect(extensionToMimeType('gif')).toBe('image/gif');
        expect(extensionToMimeType('bmp')).toBe('image/bmp');
        expect(extensionToMimeType('svg')).toBe('image/svg+xml');
        expect(extensionToMimeType('html')).toBe('text/html');
        expect(extensionToMimeType('css')).toBe('text/css');
        expect(extensionToMimeType('js')).toBe('application/javascript');
        expect(extensionToMimeType('json')).toBe('application/json');
        expect(extensionToMimeType('xml')).toBe('application/xml');
        expect(extensionToMimeType('csv')).toBe('text/csv');
    });

    it('should work with weird cases', () => {
        expect(extensionToMimeType('')).toBe('application/octet-stream');
        expect(extensionToMimeType('document')).toBe('application/octet-stream');
        expect(extensionToMimeType('documentpdf')).toBe('application/octet-stream');
    });
});
