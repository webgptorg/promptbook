import { resolveCodeBlockLanguage } from './resolveCodeBlockLanguage';

describe('resolveCodeBlockLanguage', () => {
    it('maps JavaScript and TypeScript aliases to Monaco language identifiers', () => {
        expect(resolveCodeBlockLanguage('js')).toBe('javascript');
        expect(resolveCodeBlockLanguage('javascript')).toBe('javascript');
        expect(resolveCodeBlockLanguage('ts')).toBe('typescript');
        expect(resolveCodeBlockLanguage('typescript')).toBe('typescript');
    });

    it('maps HTML, CSS, Python, Shell, JSON, and SQL aliases', () => {
        expect(resolveCodeBlockLanguage('html')).toBe('html');
        expect(resolveCodeBlockLanguage('css')).toBe('css');
        expect(resolveCodeBlockLanguage('py')).toBe('python');
        expect(resolveCodeBlockLanguage('bash')).toBe('shell');
        expect(resolveCodeBlockLanguage('json')).toBe('json');
        expect(resolveCodeBlockLanguage('postgresql')).toBe('sql');
    });

    it('returns plaintext for unknown and missing languages', () => {
        expect(resolveCodeBlockLanguage('go')).toBe('plaintext');
        expect(resolveCodeBlockLanguage('')).toBe('plaintext');
        expect(resolveCodeBlockLanguage(undefined)).toBe('plaintext');
    });
});
