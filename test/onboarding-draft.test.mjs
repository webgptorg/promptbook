import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadEngineIdentity } from '../dist/app/identity.js';
import { createOnboarding, onboardingAt, onboardingRoot, onboardingTarget, onboardingTargetExists, readOnboarding, saveOnboarding, validOnboardingFolder } from '../dist/onboarding/draft.js';
import { OnboardingSession } from '../dist/onboarding/session.js';
import { OnboardingUploads } from '../dist/onboarding/uploads.js';
import { temporaryDirectory } from './helpers.mjs';

/**
 * Private OS-home sandbox; node:test runs this file in its own process. `os.homedir()` reads `HOME` on POSIX and
 * `USERPROFILE` on Windows, so both are replaced: otherwise the drafts and project folders land in the real home.
 */
async function sandbox(t) {
    const home = await temporaryDirectory(t, 'paired installer draft');
    for (const name of ['HOME', 'USERPROFILE']) {
        const previous = process.env[name];
        process.env[name] = home;
        t.after(() => {
            if (previous === undefined) delete process.env[name];
            else process.env[name] = previous;
        });
    }
    return home;
}

test('paired retries keep one identity and accepted draft, while distinct links reserve separate engines', { skip: process.getuid?.() === 0 }, async (t) => {
    const home = await sandbox(t);
    const link = 'https://app.example.test/link#' + 'a'.repeat(26);
    const otherLink = 'https://app.example.test/link#' + 'b'.repeat(25) + 'a';
    const env = { ...process.env };
    const first = await createOnboarding(env, link);
    const project = onboardingAt(first.engineId, env);
    const identity = await loadEngineIdentity(project.runtime.app, { create: false });
    const saved = { ...first, step: 'harnesses', promptId: randomUUID(), intent: 'Keep my exact brief.', fileIds: ['saved-upload'], deferred: true };
    await saveOnboarding(project, saved);
    assert.deepEqual(await createOnboarding(env, link), saved);
    assert.equal((await loadEngineIdentity(project.runtime.app, { create: false })).engineId, identity.engineId);
    const other = await createOnboarding(env, otherLink);
    assert.notEqual(other.engineId, first.engineId);
    assert.notEqual(other.linkDigest, first.linkDigest);
    assert.deepEqual((await readdir(onboardingRoot(env))).filter(name => name !== '.ptbk').sort(), [first.engineId, other.engineId].sort());
    assert.doesNotMatch(await readFile(join(project.root, 'onboarding.json'), 'utf8'), /link#|aaaaaaaaaaaaaaaaaaaaaaaaaa/);

    const target = onboardingTarget(project, 'finished-agenda');
    await mkdir(target.root);
    await writeFile(join(target.root, 'keep.txt'), 'User project, preserve verbatim.');
    const completed = { ...saved, step: 'done', folder: 'finished-agenda' };
    await saveOnboarding(project, completed);
    assert.deepEqual(await createOnboarding(env, link), completed);
    assert.equal(await readFile(join(target.root, 'keep.txt'), 'utf8'), 'User project, preserve verbatim.');
    assert.deepEqual(await readOnboarding(onboardingAt(other.engineId, env)), other);
    assert.equal(target.root.startsWith(home), true);
});

test('folder answers refuse occupied files and symlinks, unsafe names and inaccessible homes without changing data', { skip: process.getuid?.() === 0 || process.platform === 'win32' }, async (t) => {
    const home = await sandbox(t);
    const env = { ...process.env };
    const draft = await createOnboarding(env);
    const project = onboardingAt(draft.engineId, env);
    const current = { ...draft, step: 'folder', title: 'A new project' };
    await saveOnboarding(project, current);
    const uploads = new OnboardingUploads(join(project.root, 'uploads'));
    const session = new OnboardingSession(project, current, uploads, env, async () => assert.fail('no project is confirmed'));
    const outside = join(home, 'outside');
    await mkdir(outside);
    await writeFile(join(outside, 'keep.txt'), 'Outside data.');
    const file = onboardingTarget(project, 'occupied-file').root;
    await writeFile(file, 'Existing file.');
    await symlink(outside, onboardingTarget(project, 'occupied-link').root);
    await symlink(join(home, 'missing'), onboardingTarget(project, 'dangling-link').root);
    for (const folder of ['occupied-file', 'occupied-link', 'dangling-link']) {
        assert.equal(await onboardingTargetExists(onboardingTarget(project, folder).root), true);
        await session.answer({ promptId: session.state().prompt.id, action: 'answer', answer: { kind: 'text', text: folder, fileIds: [] } });
        assert.equal(session.state().prompt.title, 'Project folder');
        assert.match(session.state().prompt.error, /already exists/);
    }
    for (const folder of ['../outside', '/tmp/agenda', 'name/child', 'CON', 'con', 'lpt1', '.hidden', 'agenda;touch bad']) {
        assert.equal(validOnboardingFolder(folder), false);
        assert.throws(() => onboardingTarget(project, folder));
    }
    assert.equal(await readFile(file, 'utf8'), 'Existing file.');
    assert.equal(await readFile(join(outside, 'keep.txt'), 'utf8'), 'Outside data.');

    const root = onboardingRoot(env);
    await chmod(root, 0o500);
    try {
        await assert.rejects(createOnboarding(env), /EACCES|permission denied/);
    } finally {
        await chmod(root, 0o700);
    }
    assert.equal((await readOnboarding(project)).engineId, draft.engineId);
});
