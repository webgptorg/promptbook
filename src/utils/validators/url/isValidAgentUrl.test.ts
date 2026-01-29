import { describe, expect, it } from '@jest/globals';
import { isValidAgentUrl } from './isValidAgentUrl';

describe(`validation of agent urls`, () => {
    it(`is valid agent url`, () => {
        expect(isValidAgentUrl(`https://core.ptbk.io/agents/adam`)).toBe(true);
        expect(isValidAgentUrl(`https://core-test.ptbk.io/agents/jxo42ppGwEh27B`)).toBe(true);
    });

    /*
    Note: [👣]
    it(`is valid pipeline url BUT not secure`, () => {
        expect(isValidPipelineUrl(`http://promptbook.studio/library/promptbook.book`)).toBe(false);
        expect(isValidPipelineUrl(`https://192.168.5.3/library/promptbook.book`)).toBe(false);
    });
    */

    it(`is NOT valid url`, () => {
        expect(isValidAgentUrl(``)).toBe(false);
        expect(isValidAgentUrl(`Invalid URL`)).toBe(false);
        expect(isValidAgentUrl(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidAgentUrl(`wtf://collboard.com/`)).toBe(false);
        expect(isValidAgentUrl(`blob:nothing`)).toBe(false);
        expect(isValidAgentUrl(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
    });
});
