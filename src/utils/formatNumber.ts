/**
 * Format either small or big number
 *
 * @private within the library
 */
export function formatNumber(value: number): string {
    if (value === 0) {
        return '0';
    }

    for (let exponent = 0; exponent < 15; exponent++) {
        const factor = 10 ** exponent;
        const valueRounded = Math.round(value * factor) / factor;

        if (
            Math.abs(value - valueRounded) / value <
            0.001 /* <- TODO: Pass as option, pass to executionReportJsonToString as option */
        ) {
            return valueRounded.toFixed(exponent);
        }
    }

    return value.toString();
}
