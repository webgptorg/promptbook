import { join } from "path";
import { describe, expect, it } from "@jest/globals";
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from "../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground";
import { prepareKnowledgePieces } from "./prepareKnowledgePieces";

/*
// TODO: [🐝] Test markdown, file and website here, rest in their own preparers

describe('all the scrapers', () => {
    // Note: Other working cases and better tests for each command is in the corresponding scraper test file

    for (const { examples, scrape } of $scrapersRegister.list()) {
        for (const example of examples) {
            expect(scrape(makeKnowledgeSourceHandler(example), {})).resolves.not.toThrowError();
        }
    }
});


*/

describe("how prepareKnowledge works", () => {
	it("should work with empty knowledge", async () => {
		const llmTools = await $provideLlmToolsForTestingAndScriptsAndPlayground();
		await expect(
			prepareKnowledgePieces(
				[],
				{ llm: llmTools },
				{
					rootDirname: join(__dirname, "examples"),
				},
			),
		).resolves.toEqual([]);
	});
});
