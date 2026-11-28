import { describe, expect, it } from '@jest/globals';
import { isValidUrl } from './isValidUrl';

describe(`validation of urls`, () => {
    it(`is valid url`, () => {
        expect(isValidUrl(`https://collboard.com/`)).toBe(true);
        expect(isValidUrl(`http://localhost:9977/fooo/add`)).toBe(true);
        expect(isValidUrl(`blob:http://localhost:9977/fooo/add`)).toBe(true);
    });

    it(`dataurl is valid url`, () => {
        // cspell:disable
        expect(isValidUrl(`data:text/plain;base64,PGgxPkhlbGxvLCBXb3JsZCE8L2gxPg==`)).toBe(true);
        expect(isValidUrl(`data:text/plain;charset=utf-8;base64,PGgxPkhlbGxvLCBXb3JsZCE8L2gxPg==`)).toBe(true);
        expect(isValidUrl(`data:text/html,%3Ch1%3EHello%2C%20World%21%3C%2Fh1%3E`)).toBe(true);
        expect(isValidUrl(`data:text/html,<h1>Hello, World!</h1>`)).toBe(true);
        // cspell:enable
    });

    it(`is NOT valid url`, () => {
        // cspell:disable
        expect(isValidUrl(``)).toBe(false);
        expect(isValidUrl(`Invalid URL`)).toBe(false);
        expect(isValidUrl(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidUrl(`wtf://collboard.com/`)).toBe(false);
        expect(isValidUrl(`blob:nothing`)).toBe(false);
        expect(isValidUrl(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
        // cspell:enable
    });

    /*
    TODO: [🏞️]
    it(`is corrupted dataurl`, () => {
        expect(isValidUrl(`data:text/plain;charset=utf-8;base12345678,PGgxPkhlbGxvLCBXb3JsZCE8L2gxPg==`)).toBe(false);
        expect(isValidUrl(`data:text/plain;base64 PGgxPkhlbGxvLCBXb3JsZCE8L2gxPg==`)).toBe(false);
        expect(isValidUrl(`data:PGgxPkhlbGxvLCBXb3JsZCE8L2gxPg==`)).toBe(false);
    });
    */

    it(`relative uri is NOT valid url`, () => {
        expect(isValidUrl(`/aegfawsgsdasdg`)).toBe(false);
        expect(isValidUrl(`?foo=bar`)).toBe(false);
    });
});
