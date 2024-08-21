import { describe, it } from '@jest/globals';
import { really_any } from '../organization/really_any';
import { isSerializableAsJson } from './isSerializableAsJson';

describe('how `isSerializableAsJson` works', () => {
    it('almost all primitives are serializable', () => {
        expect(isSerializableAsJson('Foo')).toBe(true);
        expect(isSerializableAsJson(42)).toBe(true);
        expect(isSerializableAsJson(true)).toBe(true);
        expect(isSerializableAsJson(null)).toBe(true);
    });

    it('undefined alone is not serializable', () => {
        expect(isSerializableAsJson(undefined)).toBe(false);
    });

    it('undefined in array is not serializable - it brokes order', () => {
        expect(isSerializableAsJson([undefined])).toBe(false);
        expect(isSerializableAsJson([1, undefined])).toBe(false);
        expect(isSerializableAsJson([1, undefined, 3])).toBe(false);
        expect(isSerializableAsJson({ foo: 'Hi', bar: ['hello', undefined] })).toBe(false);
    });

    it('undefined in object is serializable - it is just omited', () => {
        expect(isSerializableAsJson({ foo: undefined })).toBe(true);
        expect(isSerializableAsJson({ foo: undefined, bar: 'hello' })).toBe(true);
    });

    it('NaN is not serializable', () => {
        expect(isSerializableAsJson(NaN)).toBe(false);
    });

    it('objects and arrays are serializable if all their properties are serializable', () => {
        expect(isSerializableAsJson({ foo: 'bar' })).toBe(true);
        expect(isSerializableAsJson([1, 2, 3])).toBe(true);
    });

    it('deep objects and arrays are serializable if all their properties are serializable', () => {
        expect(isSerializableAsJson({ foo: { bar: 'baz' } })).toBe(true);
        expect(isSerializableAsJson([1, [2, 3], 4])).toBe(true);
        expect(isSerializableAsJson([1, [2, { foo: { bar: 'baz', brr: [1, 2, 3, false] } }], 4])).toBe(true);
    });

    it('objects instantiated from classes are not serializable.', () => {
        class Foo {
            constructor(public bar: string) {}
        }
        expect(isSerializableAsJson(new Foo('baz')));
    });

    it('functions are not serializable', () => {
        expect(isSerializableAsJson(() => 'Foo')).toBe(false);
    });

    it('circular references are not serializable', () => {
        const obj: Record<string, unknown> = {};
        obj.obj = obj;
        expect(isSerializableAsJson(obj)).toBe(false);
    });

    it('advanced circular references are not serializable', () => {
        const obj1: Record<string, unknown> = {};
        const obj2: Record<string, unknown> = {};
        obj1.obj = [obj2];
        obj2.obj = { foo: [obj1, obj1, obj1], bar: { baz: obj1 } };
        expect(isSerializableAsJson(obj1)).toBe(false);
    });

    it('objects with same sibling references are serializable', () => {
        const obj: really_any = {};
        obj.a = {};
        obj.b = obj.a;
        expect(isSerializableAsJson(obj)).toBe(true);
    });

    it('objects with same family references are serializable', () => {
        const obj: really_any = {};
        obj.a = {};
        obj.b = obj.a;
        obj.b = { d: { e: [obj.a] } };
        expect(isSerializableAsJson(obj)).toBe(true);
    });

    it('Date objects are not serializable', () => {
        expect(isSerializableAsJson(new Date())).toBe(false);
    });

    it('Map and Set objects are not serializable', () => {
        expect(isSerializableAsJson(new Map())).toBe(false);
        expect(isSerializableAsJson(new Set())).toBe(false);
    });

    it('RegExp objects are not serializable', () => {
        expect(isSerializableAsJson(/foo/)).toBe(false);
    });

    it('Error objects are not serializable', () => {
        expect(isSerializableAsJson(new Error())).toBe(false);
    });

    it('Symbol objects are not serializable', () => {
        expect(isSerializableAsJson(Symbol('foo'))).toBe(false);
    });
});
