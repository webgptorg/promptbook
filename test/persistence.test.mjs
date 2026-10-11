import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { installStartup, removeStartup, startupRegistration } from '../dist/coder/persistence.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';

/** Keep registration files and mocked service-manager calls inside an isolated project. */
async function fixture(t) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'ptbk-persistence-')));
    t.after(() => rm(root, { recursive: true, force: true }));
    const project = join(root, 'project with spaces & $');
    await mkdir(project);
    const workspace = await resolveWorkspace({ path: project });
    return { workspace, home: join(root, 'home'), paths: { node: process.execPath, worker: join(root, 'installation', 'service-worker.js'), configuration: join(workspace.statePath, 'service.json') } };
}

for (const platform of ['linux', 'darwin', 'win32']) {
    test(`${platform} startup lifecycle registers and removes only this project, retaining runtime state`, async t => {
        const { workspace, home, paths } = await fixture(t);
        const commands = [];
        const invoke = async (command, args, options) => {
            commands.push({ command, args, options });
            if (command === 'launchctl' && args[0] === 'print' && args[1].includes('/io.ptbk.')) throw new Error('service not found');
            return {};
        };
        const registration = await installStartup(workspace, paths, { platform, home, invoke });
        const bytes = await readFile(registration.path);
        if (platform === 'win32') {
            assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xfe]);
            assert.equal(bytes.subarray(2).toString('utf16le'), registration.content);
        } else assert.equal(bytes.toString('utf8'), registration.content);
        assert.equal(await readFile(join(workspace.statePath, 'service.log'), 'utf8'), '');
        await writeFile(join(workspace.statePath, 'pending-answer.json'), 'keep recovery and answers');
        await mkdir(join(workspace.statePath, 'browser', 'profile'), { recursive: true });
        await writeFile(join(workspace.statePath, 'browser', 'profile', 'fixture-cookie'), 'keep authenticated context');
        await removeStartup(workspace, paths, { platform, home, invoke });
        await assert.rejects(readFile(registration.path), { code: 'ENOENT' });
        assert.equal(await readFile(join(workspace.statePath, 'pending-answer.json'), 'utf8'), 'keep recovery and answers');
        assert.equal(await readFile(join(workspace.statePath, 'browser', 'profile', 'fixture-cookie'), 'utf8'), 'keep authenticated context');
        assert.ok(commands.every(({ options }) => options.timeout > 0 && options.timeout <= 20_000));
        if (platform === 'linux') {
            assert.deepEqual(commands.map(({ args }) => args), [
                ['--user', 'daemon-reload'], ['--user', 'enable', '--now', registration.name],
                ['--user', 'disable', registration.name], ['--user', 'stop', registration.name], ['--user', 'daemon-reload'],
            ]);
        } else if (platform === 'darwin') {
            const domain = `gui/${process.getuid?.()}`;
            assert.ok(commands.some(({ args }) => args.join('|') === ['bootstrap', domain, registration.path].join('|')));
            assert.ok(commands.some(({ args }) => args.join('|') === ['disable', `${domain}/${registration.name}`].join('|')));
            assert.ok(commands.some(({ args }) => args.join('|') === ['bootout', `${domain}/${registration.name}`].join('|')));
        } else {
            assert.deepEqual(commands.map(({ args }) => args), [
                ['/Create', '/TN', registration.name, '/XML', registration.path, '/F'], ['/Run', '/TN', registration.name],
                ['/Change', '/TN', registration.name, '/DISABLE'], ['/Delete', '/TN', registration.name, '/F'],
            ]);
        }
    });
}

test('startup manager failures retain actionable diagnostics and cannot report successful persistence', async t => {
    const { workspace, home, paths } = await fixture(t);
    await assert.rejects(installStartup(workspace, paths, {
        platform: 'linux', home,
        invoke: async () => { throw new Error('User manager is unavailable'); },
    }), /Could not establish startup persistence: User manager is unavailable.*running systemd user manager.*No persistent startup was reported/s);
    assert.equal(await readFile(join(workspace.statePath, 'service.log'), 'utf8'), '');
    assert.throws(() => startupRegistration(workspace, { ...paths, worker: 'bad\npath' }, 'darwin', home), /newlines or null bytes/);
});

test('headless launchd falls back to the user domain without inventing a desktop session', async t => {
    const { workspace, home, paths } = await fixture(t);
    const commands = [];
    const invoke = async (command, args) => {
        commands.push({ command, args });
        if (args[0] === 'print' && (args[1].startsWith('gui/') || args[1].includes('/io.ptbk.'))) throw new Error('service not found');
        return {};
    };
    const registration = await installStartup(workspace, paths, { platform: 'darwin', home, invoke });
    assert.ok(commands.some(({ args }) => args.join('|') === ['bootstrap', `user/${process.getuid?.()}`, registration.path].join('|')));
});
