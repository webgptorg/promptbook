import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { jokerCommandParser } from "./jokerCommandParser";

describe("how JOKER command in .book.md files works", () => {
	it("should parse JOKER command", () => {
		expect(parseCommand("joker {name}", "PIPELINE_TASK")).toEqual({
			type: "JOKER",
			parameterName: "name",
		});
		expect(parseCommand("JOKER {woooow}", "PIPELINE_TASK")).toEqual({
			type: "JOKER",
			parameterName: "woooow",
		});
	});
	it("should fail parsing JOKER command", () => {
		expect(() => parseCommand("JOKER", "PIPELINE_TASK")).toThrowError(
			/Invalid joker/i,
		);
		expect(() =>
			parseCommand("JOKER {foo} {bar}", "PIPELINE_TASK"),
		).toThrowError(
			/Invalid joker/i /* <- TODO: /JOKER must reference a parameter/i */,
		);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of jokerCommandParser.examples) {
			expect(() => parseCommand(example, "PIPELINE_TASK")).not.toThrowError();
		}
	});
});
