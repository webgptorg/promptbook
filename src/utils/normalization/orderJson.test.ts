import { describe, expect, it } from "@jest/globals";
import { orderJson } from "./orderJson";

describe("how `orderJson` works", () => {
	it("should keep object when no order given", () =>
		expect(
			JSON.stringify(
				orderJson({
					value: {
						a: 1,
						b: 2,
						c: 3,
						d: 4,
					},
					order: ["d"],
				}),
			),
		).toBe(`{"d":4,"a":1,"b":2,"c":3}`));

	it("should order simple object", () =>
		expect(
			JSON.stringify(
				orderJson({
					value: {
						a: 1,
						b: 2,
						c: 3,
						d: 4,
					},
					order: ["d"],
				}),
			),
		).toBe(`{"d":4,"a":1,"b":2,"c":3}`));
});

/**
 * TODO: [🧠] Is there a way how to test order of value better way than via `JSON.stringify`
 */
