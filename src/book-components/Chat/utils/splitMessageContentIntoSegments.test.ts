import { splitMessageContentIntoSegments } from './splitMessageContentIntoSegments';

describe('splitMessageContentIntoSegments', () => {
    it('returns a single text segment when message contains no GeoJSON', () => {
        const segments = splitMessageContentIntoSegments('Hello world!');
        expect(segments).toHaveLength(1);
        expect(segments[0]).toEqual({
            type: 'text',
            content: 'Hello world!',
        });
    });

    it('parses fenced code into code segments while preserving surrounding text', () => {
        const segments = splitMessageContentIntoSegments(
            'Here is a snippet:\n```ts\nconst foo = 123;\n```\nBack to words.',
        );

        expect(segments).toHaveLength(3);
        expect(segments[0]).toEqual({
            type: 'text',
            content: 'Here is a snippet:\n',
        });
        expect(segments[1]).toEqual({
            type: 'code',
            language: 'ts',
            code: 'const foo = 123;\n',
        });
        expect(segments[2]).toEqual({
            type: 'text',
            content: 'Back to words.',
        });
    });

    it('supports tilde fences and language aliases for code blocks', () => {
        const segments = splitMessageContentIntoSegments('Before\n~~~bash\nls -la\n~~~\nAfter');

        expect(segments[1]).toEqual({
            type: 'code',
            language: 'bash',
            code: 'ls -la\n',
        });
    });

    it('parses GeoJSON blocks into map segments while preserving surrounding text', () => {
        const segments = splitMessageContentIntoSegments(
            'Here is a map:\n```geojson\n{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}\n```\nSee you.',
        );

        expect(segments).toHaveLength(3);
        expect(segments[0]).toEqual({
            type: 'text',
            content: 'Here is a map:\n',
        });

        const mapSegment = segments[1];
        expect(mapSegment).toBeDefined();

        if (!mapSegment || mapSegment.type !== 'map') {
            throw new Error('Expected a map segment');
        }
        expect(mapSegment.data).toHaveProperty('type', 'Feature');

        expect(segments[2]).toEqual({
            type: 'text',
            content: '\nSee you.',
        });
    });

    it('leaves invalid GeoJSON blocks as text', () => {
        const content = 'Broken block:\n```geojson\nnot-json\n```\n';
        const segments = splitMessageContentIntoSegments(content);

        expect(segments.every((segment) => segment.type === 'text')).toBe(true);
        const rejoined = segments
            .filter((segment): segment is { type: 'text'; content: string } => segment.type === 'text')
            .map((segment) => segment.content)
            .join('');
        expect(rejoined).toBe(content);
    });

    it('leaves unterminated code fences as plain text', () => {
        const content = 'Broken code:\n```python\nprint("hi")';
        const segments = splitMessageContentIntoSegments(content);

        expect(segments.every((segment) => segment.type === 'text')).toBe(true);
        const rejoined = segments.map((segment) => (segment.type === 'text' ? segment.content : '')).join('');
        expect(rejoined).toBe(content);
    });
});
