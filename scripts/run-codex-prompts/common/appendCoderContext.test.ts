import { appendCoderContext } from './appendCoderContext';

describe('appendCoderContext', () => {
    it('returns the original prompt when no context is provided', () => {
        expect(appendCoderContext('Implement the feature', undefined)).toBe('Implement the feature');
    });

    it('appends trimmed context as a separate section', () => {
        expect(appendCoderContext('Implement the feature\n', '\n## Rules\n- Be careful\n')).toBe(
            'Implement the feature\n\n## Rules\n- Be careful',
        );
    });

    it('returns only the context when the prompt is empty', () => {
        expect(appendCoderContext('', 'Inline context')).toBe('Inline context');
    });
});
