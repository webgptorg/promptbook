import { describe, expect, it } from "@jest/globals";
import { mimeTypeToExtension } from "./mimeTypeToExtension";

describe("how `mimeTypeToExtension` works", () => {
	it("should work with various examples", () => {
		expect(mimeTypeToExtension("application/x-msdos-program")).toBe("exe");
		expect(mimeTypeToExtension("application/pdf")).toBe("pdf");
		expect(
			mimeTypeToExtension(
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			),
		).toBe("docx");
		expect(mimeTypeToExtension("application/msword")).toBe("doc");
		expect(mimeTypeToExtension("image/jpeg")).toBe("jpeg");
		expect(mimeTypeToExtension("image/png")).toBe("png");
		expect(mimeTypeToExtension("image/gif")).toBe("gif");
		expect(mimeTypeToExtension("image/bmp")).toBe("bmp");
		expect(mimeTypeToExtension("image/svg+xml")).toBe("svg");
		expect(mimeTypeToExtension("text/html")).toBe("html");
		expect(mimeTypeToExtension("text/css")).toBe("css");
		expect(mimeTypeToExtension("application/javascript")).toBe("js");
		expect(mimeTypeToExtension("application/json")).toBe("json");
		expect(mimeTypeToExtension("application/xml")).toBe("xml");
		expect(mimeTypeToExtension("text/csv")).toBe("csv");
	});

	it("should work with weird cases", () => {
		expect(mimeTypeToExtension("")).toBe(null);
		expect(mimeTypeToExtension("invalid/mime-type")).toBe(null);
		expect(mimeTypeToExtension("application/octet-stream")).toBe("bin");
	});
});
