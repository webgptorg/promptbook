import { describe, expect, it } from '@jest/globals';
import { asSerializable } from './asSerializable';

describe('how `asSerializable` works', () => {
    it('should serialize the simple object', () =>
        expect(
            asSerializable({
                value: true,
            }),
        ).toEqual({
            value: true,
        }));

    it('should serialize the date', () =>
        toEqual(
            asSerializable({
                value: new Date(),
            }),
        ).toBe({
            value: ``,
        }));
});
