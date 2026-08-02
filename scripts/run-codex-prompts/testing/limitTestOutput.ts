/**
 * Maximum amount of test output embedded into an agent prompt.
 */
const MAX_TEST_OUTPUT_CHARS = 12_000;

/**
 * Limits test output while keeping the end of the output, where test runners usually print the failure summary.
 */
export function limitTestOutput(testOutput: string): string {
    const normalizedTestOutput = testOutput.trim();

    if (normalizedTestOutput.length <= MAX_TEST_OUTPUT_CHARS) {
        return normalizedTestOutput;
    }

    return `[..., test output truncated to the last ${MAX_TEST_OUTPUT_CHARS} characters...]\n${normalizedTestOutput.slice(
        -MAX_TEST_OUTPUT_CHARS,
    )}`;
}
