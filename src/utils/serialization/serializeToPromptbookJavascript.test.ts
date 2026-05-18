import { describe, expect, it } from '@jest/globals';
import { serializeToPromptbookJavascript } from './serializeToPromptbookJavascript';

describe('serializeToPromptbookJavascript', () => {
    it('should serialize `undefined` as a valid javascript literal', () => {
        expect(serializeToPromptbookJavascript(undefined)).toEqual({
            imports: [],
            value: 'undefined',
        });
    });

    it('should keep `undefined` object properties serializable', () => {
        expect(
            serializeToPromptbookJavascript({
                optional: undefined,
                nested: {
                    otherOptional: undefined,
                },
            }).value,
        ).toMatch(/"optional":\s+undefined/);
    });
});
