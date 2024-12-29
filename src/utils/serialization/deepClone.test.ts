import { describe, expect, it } from '@jest/globals';
import { really_any } from '../organization/really_any';
import { deepClone } from './deepClone';

describe('how `deepClone` works', () => {
    it('should clone simple primitives and objects', () => {
        expect(deepClone(null)).toEqual(null);
        expect(deepClone(true)).toEqual(true);
        expect(deepClone(42)).toEqual(42);
        expect(deepClone('Foo')).toEqual('Foo');
        expect(deepClone({ foo: 'bar' })).toEqual({ foo: 'bar' });
        expect(deepClone([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should clone deep objects', () =>
        expect(
            deepClone({
                foo: { bar: 'baz' },
            }),
        ).toEqual({
            foo: { bar: 'baz' },
        }));

    it('should crash on circular structures', () => {
        const obj: really_any = {};
        obj.a = {};
        obj.b = obj.a;
        obj.b = { d: { e: [obj.a] } };
        obj.a.c = obj.b;

      
        expect(() => deepClone(obj)).toThrowError(/circular structure/i);
    });

    it('should clone really advanced objects', () => {
        const advancedObject = {
            level1: {
                level2: {
                    level3: {
                        level4: {
                            level5: {
                                level6: {
                                    level7: {
                                        level8: {
                                            level9: {
                                                level10: ['deep value', 'foo'],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };

        const clonedObject = deepClone(advancedObject);
        expect(clonedObject).toEqual(advancedObject);
        expect(clonedObject).not.toBe(advancedObject); // <- Note: Ensure it's a deep clone
    });
});
