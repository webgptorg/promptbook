import { describe, expect, it } from '@jest/globals';
import { decapitalize } from './decapitalize';

describe('how capitalize works', () => {
    it('will handle words beginning with lowercase', () => {
        expect(decapitalize(`foo`)).toEqual(`foo`);
        expect(decapitalize(`bar`)).toEqual(`bar`);
    });

    it('will handle words beginning with uppercase', () => {
        expect(decapitalize(`Foo`)).toEqual(`foo`);
        expect(decapitalize(`Bar`)).toEqual(`bar`);
    });

    it('will handle words beginning with number', () => {
        expect(decapitalize(`1foo`)).toEqual(`1foo`);
        expect(decapitalize(`1bar`)).toEqual(`1bar`);
    });
});
