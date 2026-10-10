import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

/** Executes read-only Git checks in the release checkout, without a shell. */
const execute = promisify(execFile);
/** Resolve the checkout from this script rather than the caller's directory. */
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
/** npm may encode an explicitly disabled Boolean setting as an empty string. */
const gitTaggingDisabled = ['', 'false', '0'].includes((process.env.npm_config_git_tag_version ?? 'true').toLowerCase());

if (!gitTaggingDisabled) {
    const { stdout: branch } = await execute('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: repositoryRoot }).catch(() => {
        throw new Error('Release versioning requires a named Git branch. Check out the release branch before running npm version.');
    });
    if (!branch.trim()) throw new Error('Release versioning requires a named Git branch.');
    const { stdout: status } = await execute('git', ['status', '--porcelain=v1', '--untracked-files=normal'], { cwd: repositoryRoot });
    if (status.trim()) throw new Error('Commit or remove pending tracked and untracked changes before running npm version. No release version was changed.');
}
