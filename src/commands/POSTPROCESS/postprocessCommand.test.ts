import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { postprocessCommandParser } from "./postprocessCommandParser";

describe("how POSTPROCESS command in .book.md files works", () => {
	it("should parse POSTPROCESS command", () => {
		expect(parseCommand("Postprocess spaceTrim", "PIPELINE_TASK")).toEqual({
			type: "POSTPROCESS",
			functionName: "spaceTrim",
		});
		expect(parseCommand("Postprocess `spaceTrim`", "PIPELINE_TASK")).toEqual({
			type: "POSTPROCESS",
			functionName: "spaceTrim",
		});
		expect(parseCommand("Postprocess **spaceTrim**", "PIPELINE_TASK")).toEqual({
			type: "POSTPROCESS",
			functionName: "spaceTrim",
		});
		expect(parseCommand("Postprocess unwrapResult", "PIPELINE_TASK")).toEqual({
			type: "POSTPROCESS",
			functionName: "unwrapResult",
		});
	});

	it("should parse POSTPROCESS command in shortcut form", () => {
		expect(parseCommand("PP unwrapResult", "PIPELINE_TASK")).toEqual({
			type: "POSTPROCESS",
			functionName: "unwrapResult",
		});
	});

	it("should fail parsing POSTPROCESS command", () => {
		expect(() =>
			parseCommand("Postprocess spaceTrim unwrapResult", "PIPELINE_TASK"),
		).toThrowError(/Can not have more than one postprocess function/i);
		expect(() =>
			parseCommand("POSTPROCESS @#$%%", "PIPELINE_TASK"),
		).toThrowError(/Invalid postprocess function name/i);
		expect(() =>
			parseCommand("Process spaceTrim", "PIPELINE_TASK"),
		).toThrowError(/Unknown command/i);
		expect(() => parseCommand("Postprocess", "PIPELINE_TASK")).toThrowError(
			/Postprocess function name is required/i,
		);
		expect(() => parseCommand("POSTPROCESS", "PIPELINE_TASK")).toThrowError(
			/Postprocess function name is required/i,
		);
		expect(() =>
			parseCommand("POSTPROCESS as^fadf", "PIPELINE_TASK"),
		).toThrowError(/Invalid postprocess function name/i);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of postprocessCommandParser.examples) {
			expect(() => parseCommand(example, "PIPELINE_TASK")).not.toThrowError();
		}
	});
});
