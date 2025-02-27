import { describe, expect, it } from "@jest/globals";
import { spaceTrim } from "spacetrim";
import { createMarkdownChart } from "./createMarkdownChart";

describe("how createMarkdownChart works", () => {
	it("should work advanced chart", () => {
		expect(
			createMarkdownChart({
				nameHeader: "Task",
				valueHeader: "Timeline",
				items: [
					{ title: "Task 1", from: 0, to: 10 },
					{ title: "Task 2", from: 4, to: 6 },
					{ title: "Task 3", from: 3, to: 9 },
					{ title: "Task 4", from: 6, to: 11 },
					{ title: "Task 5", from: 11, to: 12 },
				],
				width: 12,
				unitName: "seconds",
			}),
		).toBe(
			spaceTrim(`
                | Task   | Timeline     |
                |--------|--------------|
                | Task 1 | ██████████░░ |
                | Task 2 | ░░░░██░░░░░░ |
                | Task 3 | ░░░██████░░░ |
                | Task 4 | ░░░░░░█████░ |
                | Task 5 | ░░░░░░░░░░░█ |

                _Note: Each █ represents 1 seconds, width of timeline is 12 seconds = 12 squares_
            `),
		);
	});

	it("should round boxes to nearest whole number", () => {
		expect(
			createMarkdownChart({
				nameHeader: "Task",
				valueHeader: "Timeline",
				items: [
					{ title: "Task 1", from: -1.2, to: 9 },
					{ title: "Task 2", from: 4.5, to: 5.2 },
					{ title: "Task 3", from: 3.3, to: 8.7 },
				],
				width: 4,
				unitName: "seconds",
			}),
		).toBe(
			spaceTrim(`
              | Task   | Timeline |
              |--------|----------|
              | Task 1 | ████     |
              | Task 2 | ░░░░     |
              | Task 3 | ░░██     |

              _Note: Each █ represents 2.55 seconds, width of timeline is 10.2 seconds = 4 squares_

          `),
		);
	});
});
