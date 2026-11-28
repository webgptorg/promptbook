import { splitMessageContentByImagePrompts } from './parseImagePrompts';

describe('splitMessageContentByImagePrompts', () => {
    it('returns the original message as a single text segment when no prompts are present', () => {
        const segments = splitMessageContentByImagePrompts('Hello world!');
        expect(segments).toEqual([{ type: 'text', content: 'Hello world!' }]);
    });

    it('splits text before and after the image prompt while preserving the placeholder order', () => {
        const segments = splitMessageContentByImagePrompts('Before ![Forest](?image-prompt=Winter) after');

        expect(segments.length).toBe(3);
        expect(segments[0]).toEqual({ type: 'text', content: 'Before ' });
        expect(segments[1]).toMatchObject({
            type: 'image',
            alt: 'Forest',
            prompt: 'Winter',
        });
        expect(segments[2]).toEqual({ type: 'text', content: ' after' });
    });

    it('decodes URL-encoded prompts and falls back to placeholders when no alt text is provided', () => {
        const segments = splitMessageContentByImagePrompts('![ ](?image-prompt=Sunset%20%26%20Glow)');

        expect(segments).toHaveLength(1);
        expect(segments[0]).toMatchObject({
            type: 'image',
            alt: 'Generated image',
            prompt: 'Sunset & Glow',
        });
    });
});
