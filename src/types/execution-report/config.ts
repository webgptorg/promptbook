/**
 * The thresholds for the relative time in the `moment` NPM package.
 *
 * @see https://momentjscom.readthedocs.io/en/latest/moment/07-customization/13-relative-time-threshold/
 */
export const MOMENT_ARG_THRESHOLDS = {
    ss: 3, // <- least number of seconds to be counted in seconds, minus 1. Must be set after setting the `s` unit or without setting the `s` unit.
} as const;
