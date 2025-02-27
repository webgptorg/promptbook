import { describe, expect, it } from "@jest/globals";
import { isRootPath } from "./isRootPath";

describe("how `isRootPath` works", () => {
	it("works with Linux paths", () => {
		expect(isRootPath(`/`)).toBe(true);
		expect(isRootPath(`/foo`)).toBe(false);
	});

	it("works with Windows paths", () => {
		expect(isRootPath(`C:\\`)).toBe(true);
		expect(isRootPath(`C:\\foo`)).toBe(false);
	});
});

/**
 * TODO: [🍏] Make for MacOS paths
 */
