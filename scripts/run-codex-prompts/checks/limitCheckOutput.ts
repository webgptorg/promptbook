/**
 * Maximum amount of check output embedded into an agent prompt.
 */
const MAX_CHECK_OUTPUT_CHARS = 12_000;

/**
 * Limits check output while keeping the end of the output, where check tools usually print the failure summary.
 */
export function limitCheckOutput(checkOutput: string): string {
    // Check output is untrusted diagnostic data. Redact common credentials before persisting it in a PRD
    // or feeding it to a model; the local execution log retains the full diagnostic under the artifact policy.
    const normalizedCheckOutput = checkOutput
        .trim()
        .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+/giu, '$1[REDACTED]')
        .replace(
            /(["']?\b(?:[A-Z_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)|authorization)["']?\s*[=:]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}]+)/giu,
            '$1[REDACTED]',
        )
        .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh(?:p|o|u|s|r)_[A-Za-z0-9]{12,})\b/gu, '[REDACTED]')
        .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/giu, '$1[REDACTED]@');

    if (normalizedCheckOutput.length <= MAX_CHECK_OUTPUT_CHARS) {
        return normalizedCheckOutput;
    }

    return `[..., check output truncated to the last ${MAX_CHECK_OUTPUT_CHARS} characters...]\n${normalizedCheckOutput.slice(
        -MAX_CHECK_OUTPUT_CHARS,
    )}`;
}
