import { describe, expect, it } from '@jest/globals';
import { nameToUriPart } from './nameToUriPart';

describe('how converting name to part of URI works', () => {
    it('can convert simple name to part of URI', () => {
        expect(nameToUriPart(`foo`)).toBe(`foo`);
        expect(nameToUriPart(`Foo`)).toBe(`foo`);
        expect(nameToUriPart(`bar`)).toBe(`bar`);
        expect(nameToUriPart(`    foo Bar `)).toBe(`foo-bar`);
    });

    it('can convert name with diacritics to part of URI', () => {
        expect(nameToUriPart(`ěščřŽýáíéúů`)).toBe(`escrzyaieuu`);
        expect(nameToUriPart(`ěščř--++++////---ŽÝÁÍÉÚŮ`)).toBe(`escr-zyaieuu`);
    });
});
