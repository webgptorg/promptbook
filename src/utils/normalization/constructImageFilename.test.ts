import { describe, expect, it } from '@jest/globals';
import { constructImageFilename } from './constructImageFilename';

describe('constructImageFilename', () => {
    it('should construct a simple filename', () => {
        expect(constructImageFilename({ prompt: 'A simple prompt' })).toBe('a-simple-prompt.png');
    });

    it('should include model name if not default', () => {
        expect(constructImageFilename({ prompt: 'A simple prompt', model: 'dall-e-2' })).toBe(
            'a-simple-prompt-dall-e-2.png',
        );
    });

    it('should NOT include model name if default (dall-e-3)', () => {
        expect(constructImageFilename({ prompt: 'A simple prompt', model: 'dall-e-3' })).toBe('a-simple-prompt.png');
    });

    it('should include size, quality and style', () => {
        expect(
            constructImageFilename({
                prompt: 'A simple prompt',
                size: '1792x1024',
                quality: 'hd',
                style: 'natural',
            }),
        ).toBe('a-simple-prompt-1792x1024-hd-natural.png');
    });

    it('should normalize prompt and model name', () => {
        expect(
            constructImageFilename({
                prompt: '  Crazy___Prompt!!!  ',
                model: 'My Model 1.0',
            }),
        ).toBe('crazy-prompt-my-model-1-0.png');
    });

    it('should handle all parameters together', () => {
        expect(
            constructImageFilename({
                prompt: 'Coffee',
                model: 'dall-e-2',
                size: '1024x1792',
                quality: 'hd',
                style: 'natural',
            }),
        ).toBe('coffee-dall-e-2-1024x1792-hd-natural.png');
    });

    it('should include attachments hash', () => {
        expect(
            constructImageFilename({
                prompt: 'Coffee',
                attachments: [{ url: 'http://example.com/image1.png' }, { url: 'http://example.com/image2.png' }],
            }),
        ).toMatch(/coffee-attach-[a-z0-9]+\.png/);
    });

    it('should produce same hash for same attachments regardless of order', () => {
        const filename1 = constructImageFilename({
            prompt: 'Coffee',
            attachments: [{ url: 'http://example.com/image1.png' }, { url: 'http://example.com/image2.png' }],
        });
        const filename2 = constructImageFilename({
            prompt: 'Coffee',
            attachments: [{ url: 'http://example.com/image2.png' }, { url: 'http://example.com/image1.png' }],
        });
        expect(filename1).toBe(filename2);
    });
});
