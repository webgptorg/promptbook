import { describe, it } from '@jest/globals';
import { isSerializableAsJson } from './isSerializableAsJson';

describe('how `isSerializableAsJson` works', () => {
    it('almost all primitives are serializable', () => {
        expect(isSerializableAsJson('Foo')).toBe(true);
        expect(isSerializableAsJson(42)).toBe(true);
        expect(isSerializableAsJson(true)).toBe(true);
        expect(isSerializableAsJson(null)).toBe(true);
    });

    it('undefined is not serializable', () => {
        expect(isSerializableAsJson(undefined)).toBe(false);
    });

    it('NaN is not serializable', () => {
        expect(isSerializableAsJson(NaN)).toBe(false);
    });

    it('objects and arrays are serializable if all their properties are serializable', () => {
        expect(isSerializableAsJson({ foo: 'bar' })).toBe(true);
        expect(isSerializableAsJson([1, 2, 3])).toBe(true);
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
        obj1.obj = obj2;
        obj2.obj = obj1;
        expect(isSerializableAsJson(obj1)).toBe(false);
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
