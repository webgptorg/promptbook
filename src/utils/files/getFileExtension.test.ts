import { describe, expect, it } from '@jest/globals';
import { getFileExtension } from './getFileExtension';

describe('how `getFileExtension` works', () => {
    it('should work with various exemples', () => {
        expect(getFileExtension('file.png')).toBe('png');
        expect(getFileExtension('file.jpeg')).toBe('jpeg');
        expect(getFileExtension('foo/bar/file.jpg')).toBe('jpg');
        expect(getFileExtension('C://foo/bar/document.docx')).toBe('docx');
        expect(getFileExtension('C://foo/bar/document.docx.pdf')).toBe('pdf');
        expect(getFileExtension('C://foo/bar/document.jpeg.exe')).toBe('exe');
        expect(getFileExtension('/foo/bar/document.pdf')).toBe('pdf');
        expect(getFileExtension('X://foo\\bar\\virus.exe')).toBe('exe');
    });

    it('should work with weird cases', () => {
        expect(getFileExtension('')).toBe(null);
        expect(getFileExtension('document')).toBe(null);
        expect(getFileExtension('/foo/bar/documentpdf')).toBe(null);
        expect(getFileExtension('C://foo/bar/document')).toBe(null);
    });
});
