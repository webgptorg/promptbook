import { describe, expect, it } from '@jest/globals';
import { decodeAttachmentAsText } from './decodeAttachmentAsText';

/**
 * Stable Windows-1250 sample text fixture used to verify fallback decoding.
 */
const WINDOWS_1250_SAMPLE_TEXT = 'Příliš žluťoučký kůň';

/**
 * Stable Windows-1250 bytes for `WINDOWS_1250_SAMPLE_TEXT`.
 */
const WINDOWS_1250_SAMPLE_BYTES = Uint8Array.from([
    80, 248, 237, 108, 105, 154, 32, 158, 108, 117, 157, 111, 117, 232, 107, 253, 32, 107, 249, 242,
]);

/**
 * Minimal PNG header fixture used to verify binary detection.
 */
const PNG_SAMPLE_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

/**
 * Encodes UTF-16LE text with a BOM for fixture reuse.
 */
function encodeUtf16LeWithBom(text: string): Uint8Array {
    const body = Buffer.from(text, 'utf16le');
    return Uint8Array.from([0xff, 0xfe, ...body]);
}

describe('decodeAttachmentAsText', () => {
    it('decodes UTF-8 text with unknown extension via byte inspection', () => {
        const text = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello world\n';
        const result = decodeAttachmentAsText({
            bytes: new TextEncoder().encode(text),
            filename: 'captions.foo',
            mimeType: 'application/octet-stream',
        });

        expect(result.wasBinary).toBe(false);
        expect(result.encodingUsed).toBe('utf-8');
        expect(result.text).toBe(text);
        expect(result.warnings).toEqual([]);
    });

    it('decodes UTF-16LE text with BOM', () => {
        const text = '1\r\n00:00:00,000 --> 00:00:01,500\r\nAhoj\r\n';
        const result = decodeAttachmentAsText({
            bytes: encodeUtf16LeWithBom(text),
            filename: 'captions.srt',
            mimeType: 'application/octet-stream',
        });

        expect(result.wasBinary).toBe(false);
        expect(result.encodingUsed).toBe('utf-16le');
        expect(result.text).toBe(text);
    });

    it('falls back to windows-1250 and warns when encoding is guessed', () => {
        const result = decodeAttachmentAsText({
            bytes: WINDOWS_1250_SAMPLE_BYTES,
            filename: 'notes.txt',
            mimeType: 'text/plain',
        });

        expect(result.wasBinary).toBe(false);
        expect(result.encodingUsed).toBe('windows-1250');
        expect(result.text).toBe(WINDOWS_1250_SAMPLE_TEXT);
        expect(result.warnings).toContain('Encoding was guessed as `windows-1250`.');
    });

    it('marks PNG bytes as binary unless decoding is forced', () => {
        const result = decodeAttachmentAsText({
            bytes: PNG_SAMPLE_BYTES,
            filename: 'image.png',
            mimeType: 'image/png',
        });

        expect(result.wasBinary).toBe(true);
        expect(result.text).toBe('');
        expect(result.warnings).toContain('File content looks binary, so text decoding was skipped.');

        const forcedResult = decodeAttachmentAsText(
            {
                bytes: PNG_SAMPLE_BYTES,
                filename: 'image.png',
                mimeType: 'image/png',
            },
            {
                forceText: true,
            },
        );

        expect(forcedResult.wasBinary).toBe(false);
        expect(forcedResult.text).not.toBe('');
        expect(forcedResult.warnings).toContain(
            'File content looks binary, but text decoding was forced with `forceText`.',
        );
    });
});
