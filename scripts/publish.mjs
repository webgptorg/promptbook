import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRelease } from './validate-release.mjs';
import { verifyPublished } from './verify-published.mjs';
import { assertPublishContext } from './assert-publish-context.mjs';

assertPublishContext();

/** Publishes exactly ptbk, keeping prereleases off the stable dist-tag. */
const release = await validateRelease();
/** Only provenance is an optional publishing argument; package/tag remain fixed. */
const options = process.argv.slice(2);
if (options.some(option => option !== '--provenance')) throw new Error('release:publish accepts only --provenance.');
/** Registry publication uses the GitHub job's trusted publisher or configured npm token. */
const publish = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['publish', '--access', 'public', '--tag', release.tag, ...options], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'inherit', shell: false });
try {
    const code = await new Promise((resolve, reject) => { publish.once('error', reject); publish.once('exit', code => resolve(code ?? 1)); });
    process.exitCode = code;
    if (code === 0) {
        try { await verifyPublished(release); }
        catch (error) {
            process.stderr.write(`Publication succeeded, but registry verification failed: ${error.message}\nRun npm run release:verify before attempting another publication; npm versions cannot be overwritten.\n`);
            process.exitCode = 1;
        }
    }
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
