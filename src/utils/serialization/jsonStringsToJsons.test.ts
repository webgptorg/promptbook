import { describe, expect, it } from '@jest/globals';
import { jsonStringsToJsons } from './jsonStringsToJsons';

describe('how `jsonStringsToJsons` works', () => {
    it('should convert JSON strings', () => {
        expect(
            jsonStringsToJsons({
                hello: '{"foo": "bar"}',
            }),
        ).toEqual({
            hello: { foo: 'bar' },
        });
    });

    it('should convert deep JSON strings', () => {
        expect(
            jsonStringsToJsons({
                hello: { deep: '{"foo": "bar"}' },
            }),
        ).toEqual({
            hello: { deep: { foo: 'bar' } },
        });
    });

    it('should preserve non-json strings', () => {
        expect(
            jsonStringsToJsons({
                hello: 'world',
            }),
        ).toEqual({
            hello: 'world',
        });

        expect(
            jsonStringsToJsons({
                hello: '{"a": "bar"}',
                world: '{"b": "JSON not valid"',
            }),
        ).toEqual({
            hello: { a: 'bar' },
            world: '{"b": "JSON not valid"',
        });
    });
});
