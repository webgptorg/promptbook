import { createInlineKnowledgeSourceFile, parseDataUrlKnowledgeSource } from './inlineKnowledgeSource';

describe('inline knowledge source helpers', () => {
    it('creates a data URL with the normalized filename and text mime type', () => {
        const content = 'First line\nSecond line of the inline knowledge.';
        const sourceFile = createInlineKnowledgeSourceFile(content);

        expect(sourceFile.filename).toBe('first-line.txt');
        expect(sourceFile.mimeType).toBe('text/plain');
        expect(sourceFile.url).toMatch(/^data:text\/plain;/);

        const base64 = Buffer.from(content.trim(), 'utf-8').toString('base64');
        expect(sourceFile.url).toContain(`base64,${base64}`);
    });

    it('parses a data URL knowledge source into a buffer and metadata', () => {
        const content = 'Inline content with multiple lines.\nSecond line.';
        const { url } = createInlineKnowledgeSourceFile(content);
        const parsed = parseDataUrlKnowledgeSource(url);

        expect(parsed).not.toBeNull();
        expect(parsed?.filename).toBe('inline-content-with-multiple-lines.txt');
        expect(parsed?.mimeType).toBe('text/plain');
        expect(parsed?.buffer.toString('utf-8')).toBe(content.trim());
    });

    it('returns null for non-base64 data URLs', () => {
        expect(parseDataUrlKnowledgeSource('data:text/plain,Hello')).toBeNull();
    });
});
