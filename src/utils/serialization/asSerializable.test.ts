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
        expect(
            asSerializable({
                value: new Date(`2024-12-10T13:04:19.025Z`),
            }),
        ).toEqual({
            value: `2024-12-10T13:04:19.025Z`,
        }));
});
