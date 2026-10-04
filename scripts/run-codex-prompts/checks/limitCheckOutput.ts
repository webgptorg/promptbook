/**
 * Maximum amount of check output embedded into an agent prompt.
 */
const MAX_CHECK_OUTPUT_CHARS = 12_000;

/**
 * Limits check output while keeping the end of the output, where check tools usually print the failure summary.
 */
export function limitCheckOutput(checkOutput: string): string {
    const normalizedCheckOutput = checkOutput.trim();

    if (normalizedCheckOutput.length <= MAX_CHECK_OUTPUT_CHARS) {
        return normalizedCheckOutput;
    }

    return `[..., check output truncated to the last ${MAX_CHECK_OUTPUT_CHARS} characters...]\n${normalizedCheckOutput.slice(
        -MAX_CHECK_OUTPUT_CHARS,
    )}`;
}
