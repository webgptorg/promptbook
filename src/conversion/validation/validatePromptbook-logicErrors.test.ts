import { describe, expect, it } from '@jest/globals';
import { promptbookStringToJson } from '../promptbookStringToJson';
import { importPromptbook } from './_importPromptbook';
import { validatePromptbook } from './validatePromptbook';

describe('validatePromptbook', () => {
    it('should fail on using parameter that is not defined', () => {
        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/undefined-parameter.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/Can not resolve some parameters/i);
    });

    it('should fail on creating parameter that is then not used', () => {
        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/unused-parameter.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/Parameter \{name\} is created but not used/i);
    });

    it('should fail when picked the incompativble combination of model variant and name', () => {
        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/model-mismatch.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/Unknown model key/i);
    });

    it('should fail when expecting maximally 0 words', () => {
        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/wrong-expectations.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/Max expectation of words must be positive/i);
    });

    it('should fail when there is joker but no expectations', () => {
        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/joker-without-expectations.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/Joker parameters are used for \{name\} but no expectations are defined/i);
    });

    it('should fail on circular dependencies', () => {
        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/circular-parameters-simple.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/circular dependencies/i);

        expect(async () => {
            const promptbookString = importPromptbook('errors/logic/circular-parameters-advanced.ptbk.md');
            const promptbookJson = await promptbookStringToJson(promptbookString);
            validatePromptbook(promptbookJson);
        }).rejects.toThrowError(/circular dependencies/i);
    });
});
