import { describe, expect, it } from '@jest/globals';
import { isValidPipelineUrl } from './isValidPipelineUrl';

describe(`validation of urls`, () => {
    it(`is valid pipeline url`, () => {
        expect(isValidPipelineUrl(`https://promptbook.studio/library/promptbook.ptbk.md`)).toBe(true);
    });

    it(`is valid pipeline url BUT not secure`, () => {
        expect(isValidPipelineUrl(`http://promptbook.studio/library/promptbook.ptbk.md`)).toBe(false);
        expect(isValidPipelineUrl(`https://192.168.5.3/library/promptbook.ptbk.md`)).toBe(false);
    });

    it(`is NOT valid url`, () => {
        expect(isValidPipelineUrl(``)).toBe(false);
        expect(isValidPipelineUrl(`Invalid URL`)).toBe(false);
        expect(isValidPipelineUrl(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidPipelineUrl(`wtf://collboard.com/`)).toBe(false);
        expect(isValidPipelineUrl(`blob:nothing`)).toBe(false);
        expect(isValidPipelineUrl(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
    });

    it(`is valid url BUT not valid pipeline URL`, () => {
        expect(isValidPipelineUrl(`https://promptbook.studio/`)).toBe(false);
        expect(isValidPipelineUrl(`https://collboard.com/`)).toBe(false);
        expect(isValidPipelineUrl(`http://localhost:9977/fooo/add`)).toBe(false);
    });
});
