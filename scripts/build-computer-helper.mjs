import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root of the checked-out engine that owns the bundled native desktop helper. */
const root = fileURLToPath(new URL('../', import.meta.url));

/**
 * Compile the Apple Silicon helper on a macOS runner; published npm installs receive this prebuilt payload.
 * `crossCompile` also compiles it on an Intel Mac (swiftc targets arm64 explicitly): the release falls back to an Intel
 * runner when GitHub has no Apple Silicon runner (0.119.0-120). Local builds on Intel Macs keep skipping it.
 */
export async function buildComputerHelper({ crossCompile = false } = {}) {
    if (process.platform !== 'darwin' || (process.arch !== 'arm64' && !crossCompile)) return false;
    const source = join(root, 'src', 'computer', 'native', 'macos.swift');
    const hash = createHash('sha256').update(await readFile(source)).digest('hex');
    const directory = join(root, '.ptbk', 'computer-native', 'macos-arm64');
    const executable = join(directory, 'ptbk-computer-control');
    const stamp = join(directory, 'source.sha256');
    if ((await readFile(stamp, 'utf8').catch(() => '')).trim() === hash && (await stat(executable).catch(() => undefined))?.isFile()) return true;
    await mkdir(directory, { recursive: true });
    await new Promise((resolveCompile, reject) => {
        const child = spawn('/usr/bin/xcrun', ['swiftc', '-O', '-swift-version', '5', '-strict-concurrency=minimal', '-target', 'arm64-apple-macos14.0', source, '-o', executable], { stdio: 'inherit', shell: false });
        child.once('error', reject);
        child.once('exit', (code) => code === 0 ? resolveCompile() : reject(new Error(`Native Computer Control compilation failed (${code}).`)));
    });
    await chmod(executable, 0o755);
    // The source digest prevents accidentally packaging a helper from another revision.
    await writeFile(stamp, hash);
    return true;
}

/** Verify an incoming build artifact matches this exact tagged source before shipping it inside npm or a DMG. */
export async function verifyComputerHelper(directory) {
    const source = await readFile(join(root, 'src', 'computer', 'native', 'macos.swift'));
    const expected = createHash('sha256').update(source).digest('hex');
    const actual = (await readFile(join(directory, 'source.sha256'), 'utf8').catch(() => '')).trim();
    const executable = await readFile(join(directory, 'ptbk-computer-control')).catch(() => Buffer.alloc(0));
    return expected === actual && executable.length > 4096 && executable.subarray(0, 4).equals(Buffer.from([0xcf, 0xfa, 0xed, 0xfe]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (!await buildComputerHelper({ crossCompile: process.argv.includes('--cross') })) throw new Error('Compile the native Computer Control helper on Apple Silicon macOS (or on any Mac with --cross).');
}
