import { describe, expect, it } from "@jest/globals";
import type { really_any } from "../../utils/organization/really_any";
import { stringifyCommand } from "./stringifyCommand";

describe("stringify the commands", () => {
	/*
    TODO: [🛋] Uncomment
    for (const { name, isUsedInPipelineHead, isUsedInPipelineTask, examples } of COMMANDS) {
        for (const usagePlace of CommandUsagePlaces) {
            if (just(false)) {
                keepUnused(/* for better indentation * /);
            } else if (usagePlace === 'PIPELINE_HEAD' && !isUsedInPipelineHead) {
                continue;
            } else if (usagePlace === 'PIPELINE_TASK' && !isUsedInPipelineTask) {
                continue;
            }

            it(`should stringify command ${name} in ${usagePlace}`, () => {
                for (const example of examples) {
                    expect(stringifyCommand(parseCommand(example, usagePlace))).toBe(example);
                }
            });
        }
    }
    */

	it("should fail stringifying unknown command", () => {
		expect(() => stringifyCommand({} as really_any)).toThrowError(
			/parser is not found/i,
		);
		expect(() =>
			stringifyCommand({ type: "UNKNOWN" } as really_any),
		).toThrowError(/Command UNKNOWN parser is not found/i);
		expect(() =>
			stringifyCommand({ type: "NOTHING" } as really_any),
		).toThrowError(/Command NOTHING parser is not found/i);
	});
});
