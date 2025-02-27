import { describe, expect, it } from "@jest/globals";
import { spaceTrim } from "spacetrim";
import { DEFAULT_BOOK_TITLE } from "../../../config";
import type { PipelineString } from "../../../pipeline/PipelineString";
import { just } from "../../organization/just";
import { addPipelineCommand } from "./addPipelineCommand";

describe("how `addPipelineCommand` works", () => {
	it("should add HEAD command", () =>
		expect(
			addPipelineCommand({
				commandString: "KNOWLEDGE https://pavolhejny.com/",
				pipelineString: spaceTrim(`
                    # Book
                `) as PipelineString,
				// <- TODO: [📼] Use`book\`` string literal notation
			}),
		).toBe(
			just(
				spaceTrim(`
                    # Book

                    -   KNOWLEDGE https://pavolhejny.com/
                `),
			),
		));

	it("should add command to flat pipeline", () =>
		expect(
			addPipelineCommand({
				commandString: "KNOWLEDGE https://pavolhejny.com/",
				pipelineString: spaceTrim(`
                    Hello, how are you?

                    -> {answer}
                `) as PipelineString,
				// <- TODO: [📼] Use`book\`` string literal notation
			}),
		).toBe(
			just(
				spaceTrim(`
                    # ${DEFAULT_BOOK_TITLE}

                    -   KNOWLEDGE https://pavolhejny.com/

                    ## Prompt

                    > Hello, how are you?

                    -> {answer}
                `),
				// <- TODO: [📼] Use`book\`` string literal notation
			),
		));

	it("should preserve existing commands", () =>
		expect(
			addPipelineCommand({
				commandString: "KNOWLEDGE https://example.com/",
				pipelineString: spaceTrim(`
                    # Book

                    -   PERSONA Paul, developer
                    -   KNOWLEDGE https://pavolhejny.com/
                `) as PipelineString,
				// <- TODO: [📼] Use`book\`` string literal notation
			}),
		).toBe(
			just(
				spaceTrim(`
                    # Book

                    -   PERSONA Paul, developer
                    -   KNOWLEDGE https://pavolhejny.com/
                    -   KNOWLEDGE https://example.com/
                `),
			),
		));
});
