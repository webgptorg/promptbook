import { describe, expect, it } from '@jest/globals';
import { CollectionError } from '../CollectionError';
import { deserializeError } from './deserializeError';

describe('how `deserializeError` works', () => {
    it('should deserialize vanilla Error', () =>
        expect(deserializeError({ name: 'Error', message: 'Foo' })).toEqual(new Error('Foo')));

    it('should deserialize `CollectionError`', () =>
        expect(
            deserializeError({
                name: 'CollectionError',
                message: 'Bar',
            }),
        ).toEqual(new CollectionError('Bar')));
});
