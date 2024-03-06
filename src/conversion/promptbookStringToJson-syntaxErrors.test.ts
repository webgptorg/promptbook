import { describe, expect, it } from '@jest/globals';
import { importPromptbook } from './_importPromptbook';
import { promptbookStringToJson } from './promptbookStringToJson';

describe('promptbookStringToJson', () => {
    it('should fail on invalid language block', () => {
        expect(() =>
            promptbookStringToJson(importPromptbook('../../samples/templates/errors/syntax/invalid-language.ptbk.md')),
        ).toThrowError(/coffeescript is not supported/i);
    });
    it('should fail on missing block on prompt template', () => {
        expect(() =>
            promptbookStringToJson(importPromptbook('../../samples/templates/errors/syntax/missing-block.ptbk.md')),
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
    it('should fail on missing return declaration', () => {
        expect(() =>
            promptbookStringToJson(importPromptbook('../../samples/templates/errors/syntax/missing-return-1.ptbk.md')),
        ).toThrowError(/Invalid template/i);
    });
    it('should fail on invalid return declaration', () => {
        expect(() =>
            promptbookStringToJson(importPromptbook('../../samples/templates/errors/syntax/missing-return-2.ptbk.md')),
        ).toThrowError(/Unknown command/i);
    });
    it('should fail on multiple prompts in one prompt template', () => {
        expect(() =>
            promptbookStringToJson(importPromptbook('../../samples/templates/errors/syntax/multiple-blocks.ptbk.md')),
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
    it('should fail on lack of structure ', () => {
        expect(() =>
            promptbookStringToJson(importPromptbook('../../samples/templates/errors/syntax/no-heading.ptbk.md')),
        ).toThrowError(/The markdown file must have exactly one top-level section/i);
    });

    it('should fail on parameters collision', () => {
        expect(() =>
            promptbookStringToJson(
                importPromptbook('../../samples/templates/errors/syntax/parameters-collision.ptbk.md'),
            ),
        ).toThrowError(/Parameter \{word\} is defined multiple times/i);
    });
});
