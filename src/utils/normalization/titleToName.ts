import { basename } from "path";
import { removeEmojis } from "../removeEmojis";
import { isValidFilePath } from "../validators/filePath/isValidFilePath";
import { isValidUrl } from "../validators/url/isValidUrl";
import { normalizeToKebabCase } from "./normalize-to-kebab-case";

/**
 * @@@
 *
 * @param value @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
export function titleToName(value: string): string {
	if (isValidUrl(value)) {
		value = value.replace(/^https?:\/\//, "");
		value = value.replace(/\.html$/, "");
	} else if (isValidFilePath(value)) {
		value = basename(value);
		// Note: Keeping extension in the name
	}

	value = value.split("/").join("-");

	value = removeEmojis(value);
	value = normalizeToKebabCase(value);

	// TODO: [🧠] Maybe warn or add some padding to short name which are not good identifiers
	return value;
}
