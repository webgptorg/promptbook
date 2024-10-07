import { describe, expect, it } from '@jest/globals';
import { sourceContentToName } from './sourceContentToName';

describe('how `sourceContentToName` works', () => {
    it('should work file source', () => {
        expect(sourceContentToName('/path/to/file.doc')).toBe('source-path-to-file-doc-94997379c25e0cfe5f0b');
    });

    it('should work url source', () => {
        expect(sourceContentToName('https://promptbook.studio/file.doc')).toBe(
            'source-https-promptbook-s-9d4e414fe118421d73b1',
        );
    });

    it('should work explicit source', () => {
        expect(sourceContentToName('Promptbook is a TypeScript framework')).toBe(
            'source-promptbook-is-a-type-166bbd70c4d34342cb68',
        );
        expect(sourceContentToName('')).toBe('source-6e340b9cffb37a989ca5');
        expect(sourceContentToName('-')).toBe('source-c465d6811e5a78386e88');
    });
});

/**
 * TODO: [🧠] Make some smart crop NOT source-i-m-pavol-a-develop-... BUT source-i-m-pavol-a-developer-...
 */
