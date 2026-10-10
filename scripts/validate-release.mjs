import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Validates a release against the only publishable package and frozen lockfile. */
export async function validateRelease(tag = process.env.RELEASE_TAG) {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
    if (manifest.name !== 'ptbk' || manifest.private) throw new Error('Only the public ptbk package may be published.');
    const numeric = '(?:0|[1-9][0-9]*)';
    const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
    const versionPattern = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}(?:-${identifier}(?:\\.${identifier})*)?$`);
    if (!versionPattern.test(manifest.version)) throw new Error('Package version is not valid release semver (build metadata is not used for published versions).');
    if (lock.name !== manifest.name || lock.version !== manifest.version || lock.packages[''].name !== manifest.name || lock.packages[''].version !== manifest.version) throw new Error('Manifest and package-lock.json name/version differ.');
    if (tag && tag !== `v${manifest.version}`) throw new Error(`Release tag ${tag} must match v${manifest.version}.`);
    // Numeric prereleases are this repository's regular releases and must install by default.
    return { version: manifest.version, tag: 'latest' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const result = await validateRelease(process.argv[2]);
    process.stdout.write(`${JSON.stringify(result)}\n`);
}
