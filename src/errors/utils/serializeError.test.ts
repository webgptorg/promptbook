import { describe, expect, it } from '@jest/globals';
import { CollectionError } from '../CollectionError';
import { serializeError } from './serializeError';

describe('how `serializeError` works', () => {
    it('should serialize vanilla Error', () =>
        expect(serializeError(new Error('Foo'))).toEqual({ name: 'Error', message: 'Foo', stack: expect.any(String) }));

    it('should deserialize `CollectionError`', () =>
        expect(serializeError(new CollectionError('Bar'))).toEqual({
            name: 'CollectionError',
            message: 'Bar',
            stack: expect.any(String),
        }));
});
