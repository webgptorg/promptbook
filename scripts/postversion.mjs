import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateRelease } from './validate-release.mjs';

/** Executes Git queries without interpreting branch names as shell commands. */
const execute = promisify(execFile);
/** The version commit and tag always belong to this script's checkout. */
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
/** Preserve npm's explicit opt-out, including its empty-string Boolean encoding. */
const gitTaggingDisabled = ['', 'false', '0'].includes((process.env.npm_config_git_tag_version ?? 'true').toLowerCase());

/** Read Git output, treating a missing optional setting as an absent value. */
async function git(args, optional = false) {
    try { return (await execute('git', args, { cwd: repositoryRoot })).stdout.trim(); }
    catch (error) { if (optional && error.code === 1) return ''; throw error; }
}

/** Push the committed package version and its exact tag together; never push unrelated tags. */
async function pushVersion() {
    if (gitTaggingDisabled) {
        process.stdout.write('Git version tagging was disabled; postversion did not push or trigger publication.\n');
        return;
    }
    const release = await validateRelease('');
    const tag = `v${release.version}`;
    const branch = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], true);
    if (!branch) throw new Error('Cannot push a release from detached HEAD. Check out the branch containing the version commit and retry npm run postversion.');
    if (await git(['status', '--porcelain=v1', '--untracked-files=normal'])) throw new Error('Release checkout has pending changes. Preserve them and restore the clean version commit before retrying npm run postversion.');
    const head = await git(['rev-parse', '--verify', 'HEAD']);
    const tagObject = await git(['rev-parse', '--verify', `refs/tags/${tag}`]).catch(() => {
        throw new Error(`Missing ${tag}. Use npm version with its default Git commit/tag behavior.`);
    });
    const tagged = await git(['rev-parse', '--verify', `${tagObject}^{commit}`]);
    if (tagged !== head) throw new Error(`${tag} does not identify HEAD. Check out its version commit before retrying npm run postversion; no refs were pushed.`);
    const committed = JSON.parse(await git(['show', `${head}:package.json`]));
    const committedLock = JSON.parse(await git(['show', `${head}:package-lock.json`]));
    if (committed.name !== 'ptbk' || committed.version !== release.version || committedLock.name !== 'ptbk' || committedLock.version !== release.version || committedLock.packages?.['']?.name !== 'ptbk' || committedLock.packages?.['']?.version !== release.version) {
        throw new Error('The version commit does not contain the matching ptbk manifest and lockfile; no refs were pushed.');
    }
    const remote = await git(['config', '--get', `branch.${branch}.remote`], true) || 'origin';
    const destination = await git(['config', '--get', `branch.${branch}.merge`], true) || `refs/heads/${branch}`;
    if (remote === '.' || !(await git(['remote'])).split('\n').includes(remote)) throw new Error(`Configure a GitHub remote for ${branch} before retrying npm run postversion.`);
    if (!destination.startsWith('refs/heads/')) throw new Error(`The upstream of ${branch} is not a branch; no refs were pushed.`);
    await git(['check-ref-format', destination]);
    process.stdout.write(`Pushing ${branch} and ${tag} to ${remote}; GitHub Actions will check and publish ptbk.\n`);
    const code = await new Promise((resolve, reject) => {
        const child = spawn('git', ['push', '--atomic', '--no-follow-tags', '--', remote, `${head}:${destination}`, `${tagObject}:refs/tags/${tag}`], { cwd: repositoryRoot, stdio: 'inherit', shell: false });
        child.once('error', reject);
        child.once('exit', code => resolve(code ?? 1));
    });
    if (code !== 0) throw new Error(`Release push failed. The local version commit and ${tag} were preserved. Fix the Git remote/authentication or push rejection, then run npm run postversion; do not bump again merely to retry the push.`);
}

await pushVersion().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
