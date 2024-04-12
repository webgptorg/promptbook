import { describe, expect, it } from '@jest/globals';
import { removeDiacritics } from './removeDiacritics';

describe('how stripping of diacritics works', () => {
    it('can strip diacritics diacritics from lowercase', () => {
        expect(removeDiacritics(`ěščřžýáíéúů`)).toEqual(`escrzyaieuu`);
    });

    it('can strip diacritics diacritics from uppercase', () => {
        expect(removeDiacritics(`ĚŠČŘŽÝÁÍÉÚŮ`)).toEqual(`ESCRZYAIEUU`);
    });

    it('can strip diacritics from misc edge cases', () => {
        expect(removeDiacritics(``)).toEqual(``);
        expect(removeDiacritics(` `)).toEqual(` `);
        expect(
            removeDiacritics(` .
        .`),
        ).toEqual(` .
        .`);
        expect(removeDiacritics(` ě ě`)).toEqual(` e e`);
    });
});
