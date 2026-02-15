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
});
