import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regenerates `src/vendor/` from a webgptorg/app checkout: the platform's MIT contract packages (`@ptbk/engine-api`,
 * `@ptbk/protocol`, `@ptbk/release-tools`, `@ptbk/gateway-pages`) and the libraries they pin (zod, Sigstore,
 * SimpleWebAuthn, @peculiar/x509), bundled by Bun into one ESM file, plus the gateway pages and a provenance record.
 *
 * Usage: `node scripts/vendor-app-platform.mjs <path to a webgptorg/app checkout with bun install done>`
 *
 * The checkout's own code runs only as Bun's bundler input; nothing is executed from it.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const platform = resolve(process.argv[2] ?? '');
if (!process.argv[2]) {
    process.stderr.write('usage: node scripts/vendor-app-platform.mjs <webgptorg/app checkout>\n');
    process.exit(2);
}
const vendor = join(root, 'src', 'vendor');
const work = join(platform, 'apps', 'mock-engine', 'ptbk-vendor');

/**
 * Runs a command in the platform checkout and returns its trimmed output.
 */
function run(command, args, cwd = platform) {
    return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
}

const commit = run('git', ['rev-parse', 'HEAD']);
const dirty = run('git', ['status', '--porcelain', '--untracked-files=no']);
if (dirty) throw new Error(`The platform checkout has local changes; vendor a clean commit.\n${dirty}`);

// @peculiar/x509 is a transitive dependency (Bun's isolated store), imported by its store path so it is the same copy
// SimpleWebAuthn and Sigstore use.
const store = join(platform, 'node_modules', '.bun');
const x509Dir = (await readdir(store)).filter((name) => name.startsWith('@peculiar+x509@2.')).sort().at(-1);
if (!x509Dir) throw new Error('@peculiar/x509 2.x is not installed in the platform checkout (run bun install there).');
const entry = (await readFile(join(root, 'scripts', 'app-platform', 'entry.ts'), 'utf8')).replace('@@X509@@', relative(work, join(store, x509Dir, 'node_modules', '@peculiar', 'x509')).split(sep).join('/'));

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
await writeFile(join(work, 'entry.ts'), entry);
run('bun', ['build', 'entry.ts', '--target=node', '--format=esm', '--outfile', 'out/app-platform.js', '--metafile=out/meta.json'], work);

// Every bundled npm package with its version and license, for the notices file.
const meta = JSON.parse(await readFile(join(work, 'out', 'meta.json'), 'utf8'));
const packages = new Map();
for (const input of Object.keys(meta.inputs)) {
    const at = input.lastIndexOf('node_modules/');
    if (at < 0) continue;
    const parts = input.slice(at + 'node_modules/'.length).split('/');
    const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!packages.has(name)) packages.set(name, resolve(work, input.slice(0, at + 'node_modules/'.length), name));
}
const notices = [];
const list = [];
for (const [name, dir] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    const licenseFile = (await readdir(dir)).find((file) => /^licen[cs]e/i.test(file));
    const text = licenseFile ? (await readFile(join(dir, licenseFile), 'utf8')).trim() : `Licensed under ${String(manifest.license)} (the package ships no license file).`;
    list.push({ name, version: manifest.version, license: manifest.license });
    notices.push(`## ${name} ${manifest.version} (${String(manifest.license)})\n\n\`\`\`text\n${text}\n\`\`\``);
}
const workspaces = [];
for (const name of ['engine-api', 'protocol', 'release-tools', 'gateway-pages']) {
    const dir = join(platform, 'packages', name);
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    workspaces.push({ name: manifest.name, license: manifest.license });
    const licenseFile = (await readdir(dir)).find((file) => /^licen[cs]e/i.test(file));
    const text = licenseFile ? (await readFile(join(dir, licenseFile), 'utf8')).trim() : `MIT License, Copyright (c) Promptbook (webgptorg/app ${commit}).`;
    notices.unshift(`## ${manifest.name} (webgptorg/app ${commit.slice(0, 12)}, ${String(manifest.license)})\n\n\`\`\`text\n${text}\n\`\`\``);
}

// The declarations are written by hand for the surface the engine uses, so they survive regeneration.
const declarations = await readFile(join(vendor, 'app-platform.d.ts'), 'utf8');
await rm(vendor, { recursive: true, force: true });
await mkdir(vendor, { recursive: true });
await writeFile(join(vendor, 'app-platform.d.ts'), declarations);
const bundle = await readFile(join(work, 'out', 'app-platform.js'), 'utf8');
await writeFile(
    join(vendor, 'app-platform.js'),
    `// @ts-nocheck\n/* eslint-disable */\n// Vendored by scripts/vendor-app-platform.mjs from webgptorg/app ${commit}. Do not edit; regenerate.\n// Licenses: see THIRD_PARTY_LICENSES.md next to this file.\n${bundle}`,
);
await cp(join(platform, 'packages', 'gateway-pages', 'pages'), join(vendor, 'gateway-pages'), { recursive: true, filter: (source) => !source.endsWith('.d.ts') });
await writeFile(join(vendor, 'THIRD_PARTY_LICENSES.md'), `# Third-party licenses of the vendored App platform bundle\n\n\`app-platform.js\` and \`gateway-pages/\` are generated from webgptorg/app ${commit}. They contain the following packages.\n\n${notices.join('\n\n')}\n`);
await writeFile(
    join(vendor, 'PROVENANCE.json'),
    `${JSON.stringify({ source: 'https://github.com/webgptorg/app', commit, generatedBy: 'scripts/vendor-app-platform.mjs', bundler: `bun ${run('bun', ['--version'])}`, workspaces, packages: list }, null, 4)}\n`,
);
await rm(work, { recursive: true, force: true });
const size = (await stat(join(vendor, 'app-platform.js'))).size;
process.stdout.write(`Vendored webgptorg/app ${commit.slice(0, 12)}: ${list.length} packages, ${(size / 1024 / 1024).toFixed(2)} MB.\n`);
