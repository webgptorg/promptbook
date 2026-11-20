import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { protocol } from '../src/vendor/app-platform.js';

/** Exact platform snapshot whose public staging keys the maintainer approved (ENG-121). */
export const STAGING_PLATFORM_COMMIT = '60958c0b9290d89875087460d5b2333d2442d620';
/** SHA-256 of apps/engine-ui/release/trust-policy.staging.json at that commit. */
export const STAGING_POLICY_SHA256 = 'b642b6eb3236d986695d5951e91927642bb2d194d3cf1b02539d353a770c9f64';

/** Generates immutable JavaScript; only the build process, never engine runtime, selects its profile. */
export function appBuildSource(source, profile, policyBytes) {
    if (!['development', 'production', 'staging'].includes(profile)) throw new Error('Unknown App build profile.');
    let policy;
    if (profile === 'staging') {
        if (!policyBytes || createHash('sha256').update(policyBytes).digest('hex') !== STAGING_POLICY_SHA256) throw new Error('The pinned staging trust policy SHA-256 does not match.');
        policy = Buffer.from(policyBytes).toString('utf8');
        if (!protocol.isStagingPolicy(protocol.TrustPolicy.parse(JSON.parse(policy)))) throw new Error('The embedded policy must have the staging profile.');
    }
    if (!/APP_BUILD_PROFILE = ['"]development['"];/.test(source) || !source.includes('BUILTIN_STAGING_POLICY = undefined;')) throw new Error('The App build gate does not match the source template.');
    return source.replace(/APP_BUILD_PROFILE = ['"]development['"];/, `APP_BUILD_PROFILE = ${JSON.stringify(profile)};`)
        .replace('BUILTIN_STAGING_POLICY = undefined;', `BUILTIN_STAGING_POLICY = ${policy === undefined ? 'undefined' : JSON.stringify(policy)};`);
}

/** Seals the compiled App gate after TypeScript; source/development and production outputs contain no policy. */
export async function writeAppBuild(directory, profile) {
    const gate = new URL('app/build.js', directory);
    const policy = profile === 'staging' ? await readFile(new URL('./app-platform/trust-policy.staging.json', import.meta.url)) : undefined;
    await writeFile(gate, appBuildSource(await readFile(gate, 'utf8'), profile, policy));
}
