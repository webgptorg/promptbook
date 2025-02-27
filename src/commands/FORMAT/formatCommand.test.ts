import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { formatCommandParser } from "./formatCommandParser";

describe("how FORMAT command in .book.md files works", () => {
	it("should parse FORMAT command", () => {
		expect(parseCommand("FORMAT JSON", "PIPELINE_TASK")).toEqual({
			type: "FORMAT",
			format: "JSON",
		});

		// [🥤] - Test here relative and absolute schema reference
	});

	it("should fail parsing format command", () => {
		expect(() => parseCommand("Format 2x JSON", "PIPELINE_TASK")).toThrowError(
			/Invalid FORMAT command/i,
		);
		expect(() => parseCommand("Format PNG", "PIPELINE_TASK")).toThrowError(
			/Invalid FORMAT command/i,
		);
		expect(() => parseCommand("FORMAT", "PIPELINE_TASK")).toThrowError(
			/Invalid FORMAT command/i,
		);
		expect(() => parseCommand("FORMAT brr", "PIPELINE_TASK")).toThrowError(
			/Invalid FORMAT command/i,
		);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of formatCommandParser.examples) {
			expect(() => parseCommand(example, "PIPELINE_TASK")).not.toThrowError();
		}
	});
});
