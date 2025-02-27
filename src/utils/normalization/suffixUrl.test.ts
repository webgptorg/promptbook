import { describe, expect, it } from "@jest/globals";
import { suffixUrl } from "./suffixUrl";

describe("how `suffixUrl` works", () => {
	it("should add suffix to urls in multiple forms", () => {
		expect(suffixUrl(new URL("http://example.com"), "/")).toBe(
			"http://example.com/",
		);
		expect(suffixUrl(new URL("http://example.com/"), "/")).toBe(
			"http://example.com/",
		);
		expect(suffixUrl(new URL("http://example.com"), "/books")).toBe(
			"http://example.com/books",
		);
		expect(suffixUrl(new URL("http://example.com/"), "/books")).toBe(
			"http://example.com/books",
		);
		// expect(suffixUrl(new URL('http://example.com//'), '/books')).toBe('http://example.com/books');
		// expect(suffixUrl(new URL('http://example.com//'), '//books')).toBe('http://example.com/books');
		expect(suffixUrl(new URL("http://example.com"), "///////books")).toBe(
			"http://example.com/books",
		);
	});
});
