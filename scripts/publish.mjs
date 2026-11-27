import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRelease } from './validate-release.mjs';
import { isAlreadyPublished, verifyPublished } from './verify-published.mjs';
import { assertPublishContext } from './assert-publish-context.mjs';

assertPublishContext();

/** Publishes exactly ptbk on this repository's default installation channel. */
const release = await validateRelease();
/** Only provenance is an optional publishing argument; package/tag remain fixed. */
const options = process.argv.slice(2);
if (options.some(option => option !== '--provenance')) throw new Error('release:publish accepts only --provenance.');
/** Registry publication uses the GitHub job's npm trusted publisher (OIDC); no long-lived npm token is involved. */
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run publication through npm run release:publish in GitHub Actions.');
/** npm exchanges the GitHub OIDC token for a publish credential from this version on. */
const MINIMAL_TRUSTED_PUBLISHING_NPM = [11, 5, 1];
assertTrustedPublishingNpm(process.env.npm_config_user_agent);

/**
 * Fails before packing when the running npm cannot use trusted publishing.
 *
 * @param {string | undefined} userAgent npm's `npm_config_user_agent`, for example `npm/11.6.2 node/v24.22.3 linux x64`
 */
function assertTrustedPublishingNpm(userAgent) {
    const version = /\bnpm\/(\d+)\.(\d+)\.(\d+)/.exec(userAgent ?? '')?.slice(1).map(Number);
    if (!version) return;
    const index = version.findIndex((part, i) => part !== MINIMAL_TRUSTED_PUBLISHING_NPM[i]);
    if (index !== -1 && version[index] < MINIMAL_TRUSTED_PUBLISHING_NPM[index]) {
        throw new Error(`npm ${version.join('.')} cannot publish through trusted publishing (OIDC); npm ${MINIMAL_TRUSTED_PUBLISHING_NPM.join('.')} or newer is required (Node.js 24 ships it).`);
    }
}

/** Explains npm's misleading 404 for a refused publish credential. */
const AUTHENTICATION_REMEDY =
    'If npm answered "404 Not Found - PUT https://registry.npmjs.org/ptbk", it refused the publish credential. Check the trusted publisher of ptbk on https://www.npmjs.com/package/ptbk/access (GitHub Actions, organization webgptorg, repository promptbook, workflow publish.yml, no environment) and that the job has `id-token: write`, then rerun this job (no new version is needed).\n';

/** Publishes the release with npm's JavaScript entry point (also on Windows) and verifies the public result. */
async function publish() {
    const child = spawn(process.execPath, [npmCli, 'publish', '--access', 'public', '--tag', release.tag, ...options], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, PTBK_BUILD_PROFILE: 'staging' }, stdio: 'inherit', shell: false });
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
    process.exitCode = code;
    if (code !== 0) { process.stderr.write(AUTHENTICATION_REMEDY); return; }
    try { await verifyPublished(release); }
    catch (error) {
        process.stderr.write(`npm accepted ptbk@${release.version}, but public registry verification failed: ${error.message}\nRun npm run release:verify before attempting another publication; npm versions cannot be overwritten. If npm staged the upload, complete its package review before verification.\n`);
        process.exitCode = 1;
    }
}

try {
    // npm versions cannot be overwritten: an already published release is only verified, so a re-run of the workflow
    // (or a dispatch of the same tag) still completes the release assets that depend on the publication.
    if (await isAlreadyPublished(release)) {
        process.stdout.write(`ptbk@${release.version} is already published; verifying it instead of publishing again.\n`);
        await verifyPublished(release);
    } else {
        await publish();
    }
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
