import { isSupportedShareTargetFile, resolveShareTargetMessage } from './shareTarget';

describe('shareTarget', () => {
    it('prefers text and url parts over title when both are present', () => {
        expect(
            resolveShareTargetMessage({
                title: 'Ignored title',
                text: 'Shared text',
                url: 'https://example.com/article',
            }),
        ).toBe('Shared text\n\nhttps://example.com/article');
    });

    it('falls back to title when text and url are missing', () => {
        expect(
            resolveShareTargetMessage({
                title: 'Title only',
            }),
        ).toBe('Title only');
    });

    it('creates a synthetic message for file-only shares', () => {
        expect(resolveShareTargetMessage({ attachmentCount: 1 })).toBe('Shared file');
        expect(resolveShareTargetMessage({ attachmentCount: 2 })).toBe('Shared files');
    });

    it('returns null when the share target does not contain supported content', () => {
        expect(resolveShareTargetMessage({})).toBeNull();
    });

    it('accepts image shares by mime type', () => {
        expect(
            isSupportedShareTargetFile({
                name: 'photo.bin',
                type: 'image/jpeg',
            }),
        ).toBe(true);
    });

    it('accepts document shares by extension when mime type is missing', () => {
        expect(
            isSupportedShareTargetFile({
                name: 'proposal.docx',
                type: '',
            }),
        ).toBe(true);
    });

    it('rejects unsupported media types', () => {
        expect(
            isSupportedShareTargetFile({
                name: 'voice-message.m4a',
                type: 'audio/mp4',
            }),
        ).toBe(false);
    });
});
