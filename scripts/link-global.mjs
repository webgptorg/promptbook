import { execFile, spawn } from 'node:child_process';
import { access, constants, lstat, readFile, realpath, stat } from 'node:fs/promises';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { installedDependencyProblems } from './installed-dependencies.mjs';

/**
 * Links the global `ptbk` command to this checkout: `npm run link:global [-- --no-build] [-- --force]`.
 *
 * It builds `dist/` from the current working tree, uncommitted changes included, and runs `npm link`. `ptbk` on PATH then
 * runs this repository instead of a published release. Node resolves the link to the checkout, so the engine reports a
 * `development` installation, and self-update and automatic updates never overwrite it. Later builds of the checkout
 * take effect without linking again. While a build runs, `dist/` is missing and the linked command fails.
 *
 * `npm link` deletes a regular global installation. Engines that still run from it would load the rest of their modules
 * from this checkout, so the script refuses while the discovery registry lists such a live engine. `--force` links anyway.
 * `--no-build` links the existing `dist/` unchanged.
 *
 * The link belongs to the global prefix of the Node.js that runs npm; with nvm, each Node version keeps its own global
 * `ptbk`. `npm install --global ptbk` returns that prefix to the published release.
 */
const execute = promisify(execFile);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const npmCli = process.env.npm_execpath;
if (!npmCli) fail('Run this script with `npm run link:global`.');
const options = process.argv.slice(2);
for (const option of options) {
    if (option !== '--no-build' && option !== '--force') fail(`Unknown option ${option}. Use --no-build or --force (after \`--\`).`);
}
const build = !options.includes('--no-build');
const force = options.includes('--force');

/**
 * Prints an error and ends the script with a failure code.
 */
function fail(message) {
    process.stderr.write(`link:global: ${message}\n`);
    process.exit(1);
}

/**
 * Runs npm through its JavaScript entry point (works on Windows without a shell).
 */
function npm(args) {
    return execute(process.execPath, [npmCli, ...args], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
}

/**
 * Runs a Node.js script of this checkout with inherited output; resolves to its exit code.
 */
function runNode(script) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(process.execPath, [join(root, script)], { cwd: root, stdio: 'inherit' });
        child.on('error', reject);
        child.on('close', (code) => resolvePromise(code ?? 1));
    });
}

/**
 * Runs the linked `ptbk` command (a cmd.exe shim on Windows).
 */
function runLinked(bin, args) {
    if (process.platform === 'win32') {
        const command = [bin, ...args].map((value) => `"${value}"`).join(' ');
        return execute('cmd.exe', ['/d', '/s', '/c', `"${command}"`], { cwd: root, windowsVerbatimArguments: true });
    }
    return execute(bin, args, { cwd: root });
}

/**
 * Reads a JSON file, or undefined when it is missing or unreadable.
 */
async function readJson(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return undefined;
    }
}

/**
 * Canonical form of a path for comparisons (case-insensitive file systems on Windows).
 */
async function canonical(path) {
    const real = await realpath(path).catch(() => resolve(path));
    return process.platform === 'win32' ? real.toLowerCase() : real;
}

/**
 * Where npm keeps the global `ptbk` package and its command for a global prefix.
 */
function globalLayout(prefix) {
    if (process.platform === 'win32') return { packageDir: join(prefix, 'node_modules', 'ptbk'), bin: join(prefix, 'ptbk.cmd') };
    return { packageDir: join(prefix, 'lib', 'node_modules', 'ptbk'), bin: join(prefix, 'bin', 'ptbk') };
}

/**
 * What currently occupies the global package directory: nothing, a link (to this or another checkout) or an installation.
 */
async function describeGlobal(packageDir) {
    const entry = await lstat(packageDir).catch(() => undefined);
    if (!entry) return { kind: 'missing' };
    if (entry.isSymbolicLink()) {
        const target = await realpath(packageDir).catch(() => undefined);
        return { kind: 'link', target, here: target !== undefined && (await canonical(target)) === (await canonical(root)) };
    }
    return { kind: 'installed', version: (await readJson(join(packageDir, 'package.json')))?.version ?? 'unknown version' };
}

/**
 * Live engines that the discovery registry records as running from the given installation directory.
 *
 * Uses the registry reader of the freshly built engine, so the script never duplicates its location or format.
 */
async function liveEnginesFrom(packageDir) {
    const { readRegistry } = await import(pathToFileURL(join(root, 'dist', 'service', 'discovery.js')).href);
    const { isProcessAlive } = await import(pathToFileURL(join(root, 'dist', 'common', 'process.js')).href);
    const installation = await canonical(packageDir);
    const { entries, problem } = await readRegistry();
    const live = [];
    for (const entry of entries) {
        if (typeof entry.installation !== 'string' || !isProcessAlive(entry.pid)) continue;
        if ((await canonical(entry.installation)) === installation) live.push(entry);
    }
    return { live, problem };
}

/**
 * The first `ptbk` command a shell would find on PATH, ignoring the `node_modules/.bin` folders npm adds to scripts.
 */
async function ptbkOnPath() {
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    const extensions = process.platform === 'win32' ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean) : [''];
    for (const directory of (process.env[pathKey] ?? '').split(delimiter).filter(Boolean)) {
        const normalized = directory.split('\\').join('/');
        if (/\/node_modules\/\.bin\/?$/.test(normalized) || /\/node-gyp-bin\/?$/.test(normalized)) continue;
        for (const extension of extensions) {
            const candidate = join(directory, `ptbk${extension}`);
            const found = await stat(candidate).catch(() => undefined);
            if (!found?.isFile()) continue;
            if (process.platform !== 'win32' && !(await access(candidate, constants.X_OK).then(() => true, () => false))) continue;
            return candidate;
        }
    }
    return undefined;
}

/**
 * The checked-out revision and whether the working tree has uncommitted changes (undefined outside Git).
 */
async function revision() {
    try {
        const { stdout: head } = await execute('git', ['rev-parse', '--short', 'HEAD'], { cwd: root });
        const { stdout: status } = await execute('git', ['status', '--porcelain=v1', '--untracked-files=normal'], { cwd: root });
        return `${head.trim()}${status.trim() ? ' with uncommitted changes' : ''}`;
    } catch {
        return undefined;
    }
}

const manifest = await readJson(join(root, 'package.json'));
if (manifest?.name !== 'ptbk') fail(`${root} is not the ptbk repository.`);

// The linked command loads its runtime dependencies from this checkout's node_modules, not from a fresh installation.
const dependencyProblems = await installedDependencyProblems(root);
if (dependencyProblems.length) fail(`The installed packages do not match package-lock.json:\n- ${dependencyProblems.join('\n- ')}\nRun npm ci (or npm install) first. Nothing was linked.`);

// npm exports the global prefix to scripts. Its printed output is no substitute: npm masks UUID-like path segments as `***`.
const prefix = process.env.npm_config_global_prefix || (await npm(['prefix', '--global'])).stdout.trim();
if (!prefix || prefix.includes('***')) fail(`npm did not report a usable global prefix (${prefix || 'none'}). Run this script with \`npm run link:global\`.`);
const { packageDir, bin } = globalLayout(prefix);
const before = await describeGlobal(packageDir);

if (build) {
    process.stdout.write(`Building ${root} …\n`);
    if ((await runNode(join('scripts', 'build.mjs'))) !== 0) fail('The build failed. Nothing was linked.');
} else if (!(await stat(join(root, 'dist', 'cli.js')).catch(() => undefined))) {
    fail('dist/ has not been built. Run without --no-build. Nothing was linked.');
}

// Only a regular installation is deleted by linking; a link to a checkout leaves that checkout and its engines intact.
if (before.kind === 'installed') {
    const { live, problem } = await liveEnginesFrom(packageDir);
    if (problem) process.stderr.write(`link:global: ${problem}\n`);
    if (live.length && !force) {
        const lines = live.map((entry) => `  - ${entry.projectRoot} (${entry.engineVersion}, ${entry.mode}, pid ${entry.supervisorPid ?? entry.pid})`);
        fail(
            [
                `The global ptbk@${before.version} at ${packageDir} still runs ${live.length === 1 ? 'this engine' : `these ${live.length} engines`}:`,
                ...lines,
                `Linking deletes that installation, and ${live.length === 1 ? 'it' : 'they'} would load the rest of ${live.length === 1 ? 'its' : 'their'} modules from this checkout.`,
                `Stop them first (\`ptbk stop --path "<project>"\`), or link anyway with \`npm run link:global -- --force\`. Nothing was linked.`,
            ].join('\n'),
        );
    }
}

try {
    await npm(['link', '--ignore-scripts', '--no-audit', '--no-fund']);
} catch (error) {
    fail(`npm link failed:\n${error.stderr || error.stdout || error.message}`);
}

if ((await canonical(packageDir)) !== (await canonical(root))) fail(`${packageDir} does not point to ${root} after npm link.`);
let reported;
try {
    reported = (await runLinked(bin, ['--version'])).stdout.trim();
} catch (error) {
    fail(`The linked ${bin} does not run:\n${error.stderr || error.stdout || error.message}`);
}
if (reported !== manifest.version) fail(`The linked ${bin} reports ${reported}, expected ${manifest.version}.`);

const replaced =
    before.kind === 'installed' ? `Replaced the global ptbk@${before.version}.`
    : before.kind === 'link' && before.here ? 'It was already linked here; the link is unchanged.'
    : before.kind === 'link' ? `Replaced the link to ${before.target ?? 'a missing folder'}.`
    : undefined;
const source = await revision();
const lines = [
    `Linked the global ptbk to ${root} (ptbk@${manifest.version}${source ? `, ${source}` : ''}${build ? '' : ', existing dist/'}).`,
    ...(replaced ? [replaced] : []),
    `Command: ${bin} (Node.js ${process.version}, prefix ${prefix})`,
    'Each build of this checkout now changes the global ptbk; while a build runs, the command fails.',
    'Return to the published release with `npm install --global ptbk`.',
];
const first = await ptbkOnPath();
if (!first) lines.push(`Warning: no ptbk is on PATH. Add ${dirname(bin)} to PATH.`);
else if ((await canonical(first)) !== (await canonical(bin))) lines.push(`Warning: ptbk on PATH resolves to ${first} first. Put ${dirname(bin)} earlier on PATH or remove that command.`);
process.stdout.write(`${lines.join('\n')}\n`);
