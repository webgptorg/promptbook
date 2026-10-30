#!/usr/bin/env node
/**
 * Deterministic fake `npm` for engine self-update fixtures. It reads `npm.json` next to itself
 * (`{ versions, installDelayMs?, failInstall? }`), logs every invocation to `npm.log` and supports only the ptbk package:
 *
 * - `npm view ptbk versions --json` prints the published versions;
 * - `npm install … ptbk@<version>` in a project with `node_modules/ptbk` rewrites that installation's version and the
 *   project's dependency (keeping dependency vs devDependency) and writes a lock file, like a real local update.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'npm.json'), 'utf8'));
const args = process.argv.slice(2);
appendFileSync(join(here, 'npm.log'), `${JSON.stringify({ cwd: process.cwd(), args })}\n`);

if (args[0] === 'view' && args[1] === 'ptbk') {
    process.stdout.write(JSON.stringify(config.versions));
    process.exit(0);
}
const spec = args.find((arg) => arg.startsWith('ptbk@'));
if (args[0] === 'install' && spec) {
    await new Promise((resolve) => setTimeout(resolve, config.installDelayMs ?? 0));
    if (config.failInstall) {
        process.stderr.write('npm ERR! fake installation failure\n');
        process.exit(1);
    }
    const version = spec.slice('ptbk@'.length);
    const manifestPath = join(process.cwd(), 'node_modules', 'ptbk', 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, version }, null, 4));
    const packagePath = join(process.cwd(), 'package.json');
    const project = JSON.parse(readFileSync(packagePath, 'utf8'));
    const field = args.includes('--save-dev') ? 'devDependencies' : 'dependencies';
    project[field] = { ...project[field], ptbk: version };
    writeFileSync(packagePath, `${JSON.stringify(project, null, 2)}\n`);
    writeFileSync(join(process.cwd(), 'package-lock.json'), `${JSON.stringify({ name: project.name, lockfileVersion: 3, packages: { 'node_modules/ptbk': { version } } }, null, 2)}\n`);
    process.exit(0);
}
process.stderr.write(`fake npm: unsupported invocation ${args.join(' ')}\n`);
process.exit(1);
