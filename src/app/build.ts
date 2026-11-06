/**
 * Whether this is the engine's **conformance build** (`npm run build:conformance`), the only build that may run the
 * platform conformance suite's test levers: the `conformance-session` command, a development CA in the App data
 * directory for its own certificates, and `PTBK_CONFORMANCE_TRUST_FILE`. Release builds keep it `false` (the release
 * validation asserts it), and a production engine refuses to start when any of these is asked for.
 *
 * @private App build gate
 */
export const CONFORMANCE_BUILD: boolean = false;
