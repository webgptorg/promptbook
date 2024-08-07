import { describe, expect, it } from '@jest/globals';
import { isValidEmail } from './isValidEmail';

describe(`validation of emails`, () => {
    it(`is valid`, () => {
        expect(isValidEmail(`me@pavolhejny.com`)).toBe(true);
        expect(isValidEmail(`pavol@hejny.com`)).toBe(true);
        expect(isValidEmail(`dddd+aaaa@gmail.com`)).toBe(true);
        expect(isValidEmail(`strange-but-ok+email@webgpt.cz`)).toBe(true);
        expect(isValidEmail(`test@new.tdls.zip`)).toBe(true);
    });

    it(`is NOT valid`, () => {
        expect(isValidEmail(``)).toBe(false);
        expect(isValidEmail(`1`)).toBe(false);
        expect(isValidEmail(`1.A`)).toBe(false);
        expect(isValidEmail(`---`)).toBe(false);
        expect(isValidEmail(`@`)).toBe(false);
        expect(isValidEmail(`@@@`)).toBe(false);
        expect(isValidEmail(`@hejny`)).toBe(false);
    });
});
