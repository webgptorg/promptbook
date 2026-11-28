/**
 * Splits slash-separated metadata value into normalized tokens.
 *
 * @param raw - Raw metadata string with slash delimiters.
 * @returns Trimmed values without empty entries.
 */
export function parseSlashSeparatedMetadata(raw: string | null | undefined): Array<string> {
    if (!raw) {
        return [];
    }

    return raw
        .split('/')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}
