import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { formfactorCommandParser } from "./formfactorCommandParser";

describe("how FORMFACTOR command in .book.md files works", () => {
	it("should parse FORMFACTOR command in PIPELINE_HEAD", () => {
		expect(parseCommand("FORMFACTOR chatbot", "PIPELINE_HEAD")).toEqual({
			type: "FORMFACTOR",
			formfactorName: "CHATBOT",
		});
		expect(parseCommand("FORMFACTOR `ChatBot`", "PIPELINE_HEAD")).toEqual({
			type: "FORMFACTOR",
			formfactorName: "CHATBOT",
		});
		expect(parseCommand("FORMFACTOR `CHATBOT`", "PIPELINE_HEAD")).toEqual({
			type: "FORMFACTOR",
			formfactorName: "CHATBOT",
		});
	});

	it("should parse FORMFACTOR command in shortcut form", () => {
		expect(parseCommand("FF Chat", "PIPELINE_HEAD")).toEqual({
			type: "FORMFACTOR",
			formfactorName: "CHATBOT",
		});
	});

	it("should fail parsing FORMFACTOR command", () => {
		expect(() => parseCommand("FORMFACTOR", "PIPELINE_HEAD")).toThrowError(
			/requires exactly one argument/i,
		);
		expect(() =>
			parseCommand("FORMFACTOR Malfsdxsxed", "PIPELINE_HEAD"),
		).toThrowError(/Unknown formfactor name/i);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of formfactorCommandParser.examples) {
			expect(() => parseCommand(example, "PIPELINE_HEAD")).not.toThrowError();
		}
	});
});
