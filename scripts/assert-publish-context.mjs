import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Publication is performed by this repository's GitHub Actions release workflow. */
export function assertPublishContext(env = process.env) {
    if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== 'webgptorg/promptbook' || !env.RELEASE_TAG) {
        throw new Error('Publish ptbk through GitHub Actions. Run npm version <increment> from a clean committed branch to push its release tag, or retry Publish ptbk with the existing tag in Actions. Local npm login is not required.');
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) assertPublishContext();
