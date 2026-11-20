/**
 * Whether this is the engine's **conformance build** (`npm run build:conformance`), the only build that may run the
 * platform conformance suite's test levers: the `conformance-session` command, a development CA in the App data
 * directory for its own certificates, and `PTBK_CONFORMANCE_TRUST_FILE`. Release builds keep it `false` (the release
 * validation asserts it), and a production engine refuses to start when any of these is asked for.
 *
 * @private App build gate
 */
export const CONFORMANCE_BUILD: boolean = false;

/** Immutable build identity; runtime environment variables never choose a trust profile. @private App build gate */
export type AppBuildProfile = 'development' | 'production' | 'staging';

/** Replaced only in the compiled output by scripts/build-app-profile.mjs. @private App build gate */
export const APP_BUILD_PROFILE: AppBuildProfile = 'development';

/** Exact, hash-checked platform policy bytes, embedded only in a staging build. @private App build gate */
export const BUILTIN_STAGING_POLICY: string | undefined = undefined;

/** Human-readable trust selection for this installation, never a credential or a runtime profile switch. @private App build gate */
export function uiTrustDescription(env: NodeJS.ProcessEnv): string | undefined {
    if (env.PTBK_UI_TRUST_POLICY_FILE !== undefined) return 'UI trust: configured local policy';
    return APP_BUILD_PROFILE === 'staging' ? 'UI trust: built-in staging policy' : undefined;
}
