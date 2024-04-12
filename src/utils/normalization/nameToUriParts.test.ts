import { nameToUriParts } from '../src/nameToUriParts';

describe('how converting name to parts of URI works', () => {
    it('should convert simple name to parts of URI', () => {
        expect(nameToUriParts(`foo`)).toEqual([`foo`]);
        expect(nameToUriParts(`Foo`)).toEqual([`foo`]);
        expect(nameToUriParts(`bar`)).toEqual([`bar`]);
        expect(nameToUriParts(`    foo Bar `)).toEqual([`foo`, `bar`]);
    });

    it('should convert name with diacritics to parts of URI', () => {
        expect(nameToUriParts(`ěščřŽýáíéúů`)).toEqual([`escrzyaieuu`]);
        expect(nameToUriParts(`ěščř--++++////---ŽÝÁÍÉÚŮ`)).toEqual([
            `escr`,
            `zyaieuu`,
        ]);
    });

    it('should empty array on empty name', () => {
        expect(nameToUriParts(``)).toEqual([]);
        expect(nameToUriParts(`      `)).toEqual([]);
        expect(nameToUriParts(`___---:::`)).toEqual([]);
        expect(nameToUriParts(`--++++////-`)).toEqual([]);
    });
});
