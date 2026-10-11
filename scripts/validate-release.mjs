import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Validates a release against the only publishable package and frozen lockfile. */
export async function validateRelease(tag = process.env.RELEASE_TAG, root = new URL('../', import.meta.url)) {
    const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
    const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));
    if (manifest.name !== 'ptbk' || manifest.private !== false || manifest.workspaces) throw new Error('Only the public ptbk package may be published; workspaces are not supported.');
    if (manifest.bin?.ptbk !== 'bin/ptbk.js' || Object.keys(manifest.bin).length !== 1) throw new Error('The package must install exactly the ptbk executable at bin/ptbk.js.');
    if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org/' || manifest.publishConfig.access !== 'public') throw new Error('ptbk must publish publicly to the npm registry.');
    const executable = await readFile(new URL('bin/ptbk.js', root), 'utf8');
    if (!executable.startsWith('#!/usr/bin/env node\n')) throw new Error('The ptbk executable must have a Node.js shebang.');
    const numeric = '(?:0|[1-9][0-9]*)';
    const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
    const versionPattern = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}(?:-${identifier}(?:\\.${identifier})*)?$`);
    if (!versionPattern.test(manifest.version)) throw new Error('Package version is not valid release semver (build metadata is not used for published versions).');
    if (lock.name !== manifest.name || lock.version !== manifest.version || lock.packages?.['']?.name !== manifest.name || lock.packages?.['']?.version !== manifest.version || lock.packages?.['']?.bin?.ptbk !== manifest.bin.ptbk) throw new Error('Manifest and package-lock.json name/version/bin differ.');
    if (tag && tag !== `v${manifest.version}`) throw new Error(`Release tag ${tag} must match v${manifest.version}.`);
    // Numeric prereleases are this repository's regular releases and must install by default.
    return { version: manifest.version, tag: 'latest' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const result = await validateRelease(process.argv[2]);
    process.stdout.write(`${JSON.stringify(result)}\n`);
}
