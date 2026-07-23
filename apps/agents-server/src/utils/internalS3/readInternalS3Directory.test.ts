import { normalizeInternalS3BrowserPrefix } from './readInternalS3Directory';

describe('readInternalS3Directory', () => {
    it('normalizes relative browser prefixes below the configured root prefix', () => {
        expect(normalizeInternalS3BrowserPrefix('server-a/uploads', 'ptbk-agents')).toEqual({
            rootPrefix: 'ptbk-agents/',
            relativePrefix: 'server-a/uploads/',
            absolutePrefix: 'ptbk-agents/server-a/uploads/',
            parentPrefix: 'server-a/',
        });
    });

    it('uses the configured root prefix for the browser root', () => {
        expect(normalizeInternalS3BrowserPrefix(undefined, 'ptbk-agents/')).toEqual({
            rootPrefix: 'ptbk-agents/',
            relativePrefix: '',
            absolutePrefix: 'ptbk-agents/',
            parentPrefix: null,
        });
    });

    it('keeps malformed traversal-like prefixes at the browser root', () => {
        expect(normalizeInternalS3BrowserPrefix('../other-server', 'ptbk-agents')).toEqual({
            rootPrefix: 'ptbk-agents/',
            relativePrefix: '',
            absolutePrefix: 'ptbk-agents/',
            parentPrefix: null,
        });
    });
});
