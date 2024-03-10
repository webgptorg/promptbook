import { describe, expect, it } from '@jest/globals';
import { promptbookStringToJson } from '../promptbookStringToJson';
import { validatePromptbookJson } from '../validatePromptbookJson';
import { importPromptbook } from './_importPromptbook';

describe('validatePromptbookJson', () => {
    it('should fail on using parameter that is not defined', () => {
        expect(() => {
            const promptbookString = importPromptbook(
                '../../samples/templates/errors/logic/undefined-parameter.ptbk.md',
            );
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/Can not resolve some parameters/i);
    });

    it('should fail on creating parameter that is then not used', () => {
        expect(() => {
            const promptbookString = importPromptbook('../../samples/templates/errors/logic/unused-parameter.ptbk.md');
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/Parameter \{name\} is created but not used/i);
    });

    it('should fail when picked the incompativble combination of model variant and name', () => {
        expect(() => {
            const promptbookString = importPromptbook('../../samples/templates/errors/logic/model-mismatch.ptbk.md');
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/Unknown model key/i);
    });

    it('should fail when expecting maximally 0 words', () => {
        expect(() => {
            const promptbookString = importPromptbook(
                '../../samples/templates/errors/logic/wrong-expectations.ptbk.md',
            );
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/Max expectation of words must be positive/i);
    });

    it('should fail when there is joker but no expectations', () => {
        expect(() => {
            const promptbookString = importPromptbook(
                '../../samples/templates/errors/logic/joker-without-expectations.ptbk.md',
            );
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/Joker parameters are used but no expectations are defined/i);
    });

    it('should fail on circular dependencies', () => {
        expect(() => {
            const promptbookString = importPromptbook(
                '../../samples/templates/errors/logic/circular-parameters-simple.ptbk.md',
            );
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/circular dependencies/i);

        expect(() => {
            const promptbookString = importPromptbook(
                '../../samples/templates/errors/logic/circular-parameters-advanced.ptbk.md',
            );
            const promptbookJson = promptbookStringToJson(promptbookString);
            validatePromptbookJson(promptbookJson);
        }).toThrowError(/circular dependencies/i);
    });
});
