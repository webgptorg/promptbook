import { describe, expect, it } from '@jest/globals';
import { toStalwartJmapObjectList, toStalwartJmapSet } from './stalwartJmapValues';

describe('toStalwartJmapSet', () => {
    it('builds an empty set as an object and not as an array', () => {
        const emptySet = toStalwartJmapSet([]);

        expect(emptySet).toEqual({});
        expect(Array.isArray(emptySet)).toBe(false);
        expect(JSON.stringify(emptySet)).toBe('{}');
    });

    it('keys every member by its own value', () => {
        expect(toStalwartJmapSet(['data'])).toEqual({ data: true });
        expect(toStalwartJmapSet(['connect', 'data'])).toEqual({ connect: true, data: true });
    });

    it('collapses repeated members', () => {
        expect(toStalwartJmapSet(['data', 'data'])).toEqual({ data: true });
    });
});

describe('toStalwartJmapObjectList', () => {
    it('builds an empty object list as an object and not as an array', () => {
        const emptyObjectList = toStalwartJmapObjectList([]);

        expect(emptyObjectList).toEqual({});
        expect(Array.isArray(emptyObjectList)).toBe(false);
        expect(JSON.stringify(emptyObjectList)).toBe('{}');
    });

    it('keys every item by its decimal index', () => {
        expect(toStalwartJmapObjectList([{ name: 'postmaster' }, { name: 'dmarc-reports' }])).toEqual({
            '0': { name: 'postmaster' },
            '1': { name: 'dmarc-reports' },
        });
    });

    it('keeps duplicate items because they are addressed by index', () => {
        expect(toStalwartJmapObjectList([{ name: 'postmaster' }, { name: 'postmaster' }])).toEqual({
            '0': { name: 'postmaster' },
            '1': { name: 'postmaster' },
        });
    });
});
