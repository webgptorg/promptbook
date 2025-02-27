import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { sectionCommandParser } from "./sectionCommandParser";

describe("how SECTION command in .book.md files works", () => {
	it("should parse SECTION command in recommended form", () => {
		expect(parseCommand("PROMPT SECTION", "PIPELINE_TASK")).toEqual({
			type: "SECTION",
			taskType: "PROMPT_TASK",
		});

		// Note: No need to test all types, because it is tested from `sectionCommandParser.examples`
	});

	it("should work with deprecated EXECUTE command", () => {
		expect(parseCommand("EXECUTE Prompt", "PIPELINE_TASK")).toEqual({
			type: "SECTION",
			taskType: "PROMPT_TASK",
		});
		expect(parseCommand("EXECUTE simple", "PIPELINE_TASK")).toEqual({
			type: "SECTION",
			taskType: "SIMPLE_TASK",
		});
		expect(parseCommand("EXECUTE script", "PIPELINE_TASK")).toEqual({
			type: "SECTION",
			taskType: "SCRIPT_TASK",
		});
		expect(parseCommand("EXECUTE dialog", "PIPELINE_TASK")).toEqual({
			type: "SECTION",
			taskType: "DIALOG_TASK",
		});
	});

	it("should fail parsing SECTION command", () => {
		expect(() => parseCommand("section fooo", "PIPELINE_TASK")).toThrowError(
			/Unknown section type/i,
		);
		expect(() =>
			parseCommand("section script prompt", "PIPELINE_TASK"),
		).toThrowError(/Unknown section type/i);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of sectionCommandParser.examples) {
			expect(() => parseCommand(example, "PIPELINE_TASK")).not.toThrowError();
		}
	});
});
