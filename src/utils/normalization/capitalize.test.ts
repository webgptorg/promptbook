import { capitalize } from '../src/capitalize';

describe('how capitalize works', () => {
    it('will handle words beginning with lowercase', () => {
        expect(capitalize(`foo`)).toEqual(`Foo`);
        expect(capitalize(`bar`)).toEqual(`Bar`);
    });

    it('will handle words beginning with uppercase', () => {
        expect(capitalize(`Foo`)).toEqual(`Foo`);
        expect(capitalize(`Bar`)).toEqual(`Bar`);
    });

    it('will handle words beginning with number', () => {
        expect(capitalize(`1foo`)).toEqual(`1foo`);
        expect(capitalize(`1bar`)).toEqual(`1bar`);
    });
});
