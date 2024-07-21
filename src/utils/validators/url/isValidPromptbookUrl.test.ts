import { describe, expect, it } from '@jest/globals';
import { isValidPromptbookUrl } from './isValidPromptbookUrl';

describe(`validation of urls`, () => {
    it(`is valid promptbook url`, () => {
        expect(isValidPromptbookUrl(`https://promptbook.studio/library/promptbook.ptbk.md`)).toBe(true);
    });

    it(`is valid promptbook url BUT not secure`, () => {
        expect(isValidPromptbookUrl(`http://promptbook.studio/library/promptbook.ptbk.md`)).toBe(true);
        expect(isValidPromptbookUrl(`https://192.168.5.3/library/promptbook.ptbk.md`)).toBe(true);
    });

    it(`is NOT valid url`, () => {
        expect(isValidPromptbookUrl(``)).toBe(false);
        expect(isValidPromptbookUrl(`Invalid URL`)).toBe(false);
        expect(isValidPromptbookUrl(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidPromptbookUrl(`wtf://collboard.com/`)).toBe(false);
        expect(isValidPromptbookUrl(`blob:nothing`)).toBe(false);
        expect(isValidPromptbookUrl(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
    });

    it(`is valid url BUT not valid Promptbook URL`, () => {
        expect(isValidPromptbookUrl(`https://promptbook.studio/`)).toBe(true);
        expect(isValidPromptbookUrl(`https://collboard.com/`)).toBe(true);
        expect(isValidPromptbookUrl(`http://localhost:9977/fooo/add`)).toBe(true);
    });
});
