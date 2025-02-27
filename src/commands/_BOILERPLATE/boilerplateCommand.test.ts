import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { boilerplateCommandParser } from "./boilerplateCommandParser";

describe("how BOILERPLATE command in .book.md files works", () => {
	it("should parse BOILERPLATE command in PIPELINE_HEAD", () => {
		expect(parseCommand("BOILERPLATE foo", "PIPELINE_HEAD")).toEqual({
			type: "BOILERPLATE",
			value: "foo",
		});
		expect(parseCommand("BOILERPLATE bar", "PIPELINE_HEAD")).toEqual({
			type: "BOILERPLATE",
			value: "bar",
		});
	});

	it("should parse BOILERPLATE command in PIPELINE_TASK", () => {
		expect(parseCommand("BOILERPLATE foo", "PIPELINE_TASK")).toEqual({
			type: "BOILERPLATE",
			value: "foo",
		});
		expect(parseCommand("BOILERPLATE bar", "PIPELINE_TASK")).toEqual({
			type: "BOILERPLATE",
			value: "bar",
		});
	});

	it("should parse BOILERPLATE command in shortcut form", () => {
		expect(parseCommand("BP foo", "PIPELINE_HEAD")).toEqual({
			type: "BOILERPLATE",
			value: "foo",
		});
		expect(parseCommand("BP bar", "PIPELINE_TASK")).toEqual({
			type: "BOILERPLATE",
			value: "bar",
		});
	});

	it("should fail parsing BOILERPLATE command", () => {
		expect(() => parseCommand("BOILERPLATE", "PIPELINE_HEAD")).toThrowError(
			/requires exactly one argument/i,
		);
		expect(() => parseCommand("BOILERPLATE brr", "PIPELINE_HEAD")).toThrowError(
			/BOILERPLATE value can not contain brr/i,
		);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of boilerplateCommandParser.examples) {
			// TODO: @@ Remove places not using the command:
			expect(() => parseCommand(example, "PIPELINE_HEAD")).not.toThrowError();
			expect(() => parseCommand(example, "PIPELINE_TASK")).not.toThrowError();
		}
	});
});
