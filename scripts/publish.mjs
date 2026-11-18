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
/** Registry publication uses the GitHub job's trusted publisher or configured npm token. */
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run publication through npm run release:publish in GitHub Actions.');

/** Publishes the release with npm's JavaScript entry point (also on Windows) and verifies the public result. */
async function publish() {
    const child = spawn(process.execPath, [npmCli, 'publish', '--access', 'public', '--tag', release.tag, ...options], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'inherit', shell: false });
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
    process.exitCode = code;
    if (code !== 0) return;
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
