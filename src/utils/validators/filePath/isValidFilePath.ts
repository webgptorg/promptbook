import type { string_filename } from "../../../types/typeAliases";
import type { really_unknown } from "../../organization/really_unknown";

/**
 * Tests if given string is valid URL.
 *
 * Note: This does not check if the file exists only if the path is valid
 * @public exported from `@promptbook/utils`
 */
export function isValidFilePath(
	filename: really_unknown,
): filename is string_filename {
	if (typeof filename !== "string") {
		return false;
	}

	if (filename.split("\n").length > 1) {
		return false;
	}

	if (
		filename.split(" ").length >
		5 /* <- TODO: [🧠][🈷] Make some better non-arbitrary way how to distinct filenames from informational texts */
	) {
		return false;
	}

	const filenameSlashes = filename.split("\\").join("/");

	// Absolute Unix path: /hello.txt
	if (/^(\/)/i.test(filenameSlashes)) {
		// console.log(filename, 'Absolute Unix path: /hello.txt');
		return true;
	}

	// Absolute Windows path: /hello.txt
	if (/^([A-Z]{1,2}:\/?)\//i.test(filenameSlashes)) {
		// console.log(filename, 'Absolute Windows path: /hello.txt');
		return true;
	}

	// Relative path: ./hello.txt
	if (/^(\.\.?\/)+/i.test(filenameSlashes)) {
		// console.log(filename, 'Relative path: ./hello.txt');
		return true;
	}

	// Allow paths like foo/hello
	if (/^[^/]+\/[^/]+/i.test(filenameSlashes)) {
		// console.log(filename, 'Allow paths like foo/hello');
		return true;
	}

	// Allow paths like hello.book
	if (/^[^/]+\.[^/]+$/i.test(filenameSlashes)) {
		// console.log(filename, 'Allow paths like hello.book');
		return true;
	}

	return false;
}

/**
 * TODO: [🍏] Implement for MacOs
 */
