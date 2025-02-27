import { describe, expect, it } from "@jest/globals";
import spaceTrim from "spacetrim";
import { prompt } from "./prompt-notation";

describe("how prompt tag function works", () => {
	it("should work with simple prompt", () =>
		expect(
			prompt`
                You are a biochemistry expert

                - Explain the process of ATP synthesis in mitochondria
            `,
		).toBe(
			spaceTrim(`
                You are a biochemistry expert

                - Explain the process of ATP synthesis in mitochondria
            `),
		));

	it("should work with interpolated string template", () =>
		expect(
			prompt`
                You are a chemistry expert

                - Explain the chemical bonds in ${"water molecules"}
            `,
		).toBe(
			spaceTrim(`
                You are a chemistry expert

                - Explain the chemical bonds in water molecules
            `),
		));

	it("should work with multiline interpolated string template", () =>
		expect(
			prompt`
                You are a molecular biologist

                ${"DNA replication\nTranscription"}
            `,
		).toBe(
			spaceTrim(`
                You are a molecular biologist
                
                DNA replication
                Transcription
            `),
		));

	it("should separate data and instructions", () =>
		expect(
			prompt`
                You are a geneticist

                - ${"Dominant alleles\nRecessive alleles"}
            `,
		).toBe(
			spaceTrim(`
                You are a geneticist

                - Dominant alleles
                - Recessive alleles
            `),
		));

	it("should keep non-javascript parameters", () =>
		expect(
			prompt`
                You are a geneticist

                - ${"Dominant alleles\nRecessive alleles"}
                - {more}
            `,
		).toBe(
			spaceTrim(`
                You are a geneticist

                - Dominant alleles
                - Recessive alleles
                - {more}
            `),
		));
});

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 */
