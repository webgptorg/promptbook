import { describe, expect, it } from "@jest/globals";
import { parseCommand } from "../_common/parseCommand";
import { expectCommandParser } from "./expectCommandParser";

describe("how EXPECT command in .book.md files works", () => {
	it("should parse EXPECT command", () => {
		expect(parseCommand("Expect exactly 1 character", "PIPELINE_TASK")).toEqual(
			{
				type: "EXPECT",
				sign: "EXACTLY",
				unit: "CHARACTERS",
				amount: 1,
			},
		);

		expect(parseCommand("Expect exactly 1 char", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "CHARACTERS",
			amount: 1,
		});

		expect(
			parseCommand("Expect mininimum 1 character", "PIPELINE_TASK"),
		).toEqual({
			type: "EXPECT",
			sign: "MINIMUM",
			unit: "CHARACTERS",
			amount: 1,
		});

		expect(
			parseCommand("Expect minimally 1 character", "PIPELINE_TASK"),
		).toEqual({
			type: "EXPECT",
			sign: "MINIMUM",
			unit: "CHARACTERS",
			amount: 1,
		});

		expect(parseCommand("Expect min 1 char", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "MINIMUM",
			unit: "CHARACTERS",
			amount: 1,
		});

		expect(parseCommand("Expect maximum 5 character", "PIPELINE_TASK")).toEqual(
			{
				type: "EXPECT",
				sign: "MAXIMUM",
				unit: "CHARACTERS",
				amount: 5,
			},
		);

		expect(
			parseCommand("Expect maximally 5 characters", "PIPELINE_TASK"),
		).toEqual({
			type: "EXPECT",
			sign: "MAXIMUM",
			unit: "CHARACTERS",
			amount: 5,
		});

		expect(parseCommand("Expect max 5 CHARs", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "MAXIMUM",
			unit: "CHARACTERS",
			amount: 5,
		});

		expect(parseCommand("Expect exact 1 word", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "WORDS",
			amount: 1,
		});

		expect(parseCommand("Expect exactly 1 word", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "WORDS",
			amount: 1,
		});

		expect(parseCommand("Expect eXactly 1 word", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "WORDS",
			amount: 1,
		});

		expect(parseCommand("EXPECT EXACTLY 1 WORD", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "WORDS",
			amount: 1,
		});

		expect(parseCommand("Expect exactly 2 words", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "WORDS",
			amount: 2,
		});

		expect(parseCommand("Expect exactly 1 sentence", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "SENTENCES",
			amount: 1,
		});

		expect(parseCommand("Expect exactly 2 sentences", "PIPELINE_TASK")).toEqual(
			{
				type: "EXPECT",
				sign: "EXACTLY",
				unit: "SENTENCES",
				amount: 2,
			},
		);

		expect(parseCommand("Expect exactly 0 sentences", "PIPELINE_TASK")).toEqual(
			{
				type: "EXPECT",
				sign: "EXACTLY",
				unit: "SENTENCES",
				amount: 0,
			},
		);

		expect(parseCommand("Expect exactly 1 paragraph", "PIPELINE_TASK")).toEqual(
			{
				type: "EXPECT",
				sign: "EXACTLY",
				unit: "PARAGRAPHS",
				amount: 1,
			},
		);

		expect(
			parseCommand("Expect exactly 2 paragraphs", "PIPELINE_TASK"),
		).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "PARAGRAPHS",
			amount: 2,
		});

		expect(parseCommand("Expect exactly 1 line", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "LINES",
			amount: 1,
		});

		expect(parseCommand("Expect exactly 2 lines", "PIPELINE_TASK")).toEqual({
			type: "EXPECT",
			sign: "EXACTLY",
			unit: "LINES",
			amount: 2,
		});

		// TODO: Add page test
	});

	it("should fail parsing expect command", () => {
		expect(() =>
			parseCommand("Expect foo 1 char", "PIPELINE_TASK"),
		).toThrowError(/Invalid EXPECT command/i);
		expect(() =>
			parseCommand("Expect min 1 vars", "PIPELINE_TASK"),
		).toThrowError(/Invalid EXPECT command/i);
		expect(() =>
			parseCommand("Expect min chars", "PIPELINE_TASK"),
		).toThrowError(/Invalid EXPECT command/i);
		expect(() =>
			parseCommand("Expect min xx chars", "PIPELINE_TASK"),
		).toThrowError(/Invalid EXPECT command/i);
		expect(() =>
			parseCommand("Expect exactly 2 p", "PIPELINE_TASK"),
		).toThrowError(/Ambiguous unit "p"/i);
		expect(() => parseCommand("EXPECT", "PIPELINE_TASK")).toThrowError(
			/Invalid EXPECT command/i,
		);
		expect(() => parseCommand("EXPECT brr", "PIPELINE_TASK")).toThrowError(
			/Invalid EXPECT command/i,
		);
	});

	it(`should work with all examples`, () => {
		// Note: This is tested also in the common test file parseCommand.test.ts
		for (const example of expectCommandParser.examples) {
			expect(() => parseCommand(example, "PIPELINE_TASK")).not.toThrowError();
		}
	});
});
