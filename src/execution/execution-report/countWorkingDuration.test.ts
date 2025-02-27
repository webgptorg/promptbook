import { describe, expect, it } from "@jest/globals";
import { countWorkingDuration } from "./countWorkingDuration";

describe("how countWorkingDuration works", () => {
	it("should work with single item", () => {
		expect(countWorkingDuration([{ title: "Task 1", from: 0, to: 1 }])).toBe(1);
		expect(countWorkingDuration([{ title: "Task 1", from: 0, to: 2 }])).toBe(2);
		expect(countWorkingDuration([{ title: "Task 1", from: -1, to: 1 }])).toBe(
			2,
		);
	});

	it("should work with full coverage", () => {
		expect(
			countWorkingDuration([
				{ title: "Task 1", from: 0, to: 10 },
				{ title: "Task 2", from: 4, to: 6 },
				{ title: "Task 3", from: 3, to: 9 },
				{ title: "Task 4", from: 6, to: 11 },
				{ title: "Task 5", from: 11, to: 12 },
			]),
		).toBe(12);
	});

	it("should work with sparse coverage", () => {
		expect(
			countWorkingDuration([
				{ title: "Task 1", from: 0, to: 1 },
				{ title: "Task 2", from: 2, to: 3 },
			]),
		).toBe(2);
		expect(
			countWorkingDuration([
				{ title: "Task 1", from: 0, to: 1 },
				{ title: "Task 2", from: 3, to: 4 },
			]),
		).toBe(2);
	});

	it("should work in advanced case", () => {
		expect(
			countWorkingDuration([
				{ title: "Task 1", from: 0, to: 1 },
				{ title: "Task 2", from: -2.2, to: 3 },
				{ title: "Task 3", from: 3, to: 4 },
				{ title: "Task 4", from: 3, to: 6.4 },
				{ title: "Task 5", from: 5, to: 7 },
				{ title: "Task 5", from: 85, to: 100 },
			]),
		).toBeCloseTo(24.2);
	});
});
