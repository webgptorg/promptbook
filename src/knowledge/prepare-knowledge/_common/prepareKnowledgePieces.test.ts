import { describe, expect, it } from '@jest/globals';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { prepareKnowledgePieces } from './prepareKnowledgePieces';

/*
// TODO: [🐝] Test markdown, file and website here, rest in their own preparers

describe('all the scrapers', () => {
    // Note: Other working cases and better tests for each command is in the corresponding scraper test file

    for (const { examples, scrape } of SCRAPERS) {
        for (const example of examples) {
            expect(scrape(emulateScraperSourceOptions(example), {})).resolves.not.toThrowError();
        }
    }
});


*/

describe('how prepareKnowledge works', () => {
    it('should work with empty knowledge', () =>
        expect(
            prepareKnowledgePieces([], {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                filesystemTools: null,
            }),
        ).resolves.toEqual([]));
});
