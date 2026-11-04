import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { projectsRootForHome } from '../dist/common/user-home.js';
import { temporaryDirectory } from './helpers.mjs';

test('the ordinary shared projects default remains home/ptbk/project and selection creates nothing', async (t) => {
    const home = await temporaryDirectory(t, 'ptbk home default');
    assert.equal(projectsRootForHome(home), join(home, 'ptbk', 'project'));
    assert.deepEqual(await readdir(home), []);
});

test('a legacy ptbk file selects a stable alternative and preserves all existing content', async (t) => {
    const home = await temporaryDirectory(t, 'ptbk home \u00fc [x] & legacy file');
    await writeFile(join(home, 'ptbk'), 'legacy user content');
    assert.equal(projectsRootForHome(home), join(home, 'ptbk-projects'));
    await mkdir(join(home, 'ptbk-projects'));
    await writeFile(join(home, 'ptbk-projects', 'kept.txt'), 'existing projects stay here');
    assert.equal(projectsRootForHome(home), join(home, 'ptbk-projects'), 'repeated setup reuses the same ordinary container');
    assert.equal(await readFile(join(home, 'ptbk'), 'utf8'), 'legacy user content');
    assert.equal(await readFile(join(home, 'ptbk-projects', 'kept.txt'), 'utf8'), 'existing projects stay here');
});

test('a file at either preferred segment and occupied alternatives are never replaced', async (t) => {
    const home = await temporaryDirectory(t, 'ptbk home occupied alternatives');
    await mkdir(join(home, 'ptbk'));
    await writeFile(join(home, 'ptbk', 'project'), 'project is a file');
    await writeFile(join(home, 'ptbk-projects'), 'first alternative is a file');
    await writeFile(join(home, 'ptbk-projects-2'), 'second alternative is a file');
    assert.equal(projectsRootForHome(home), join(home, 'ptbk-projects-3'));
    assert.equal(await readFile(join(home, 'ptbk', 'project'), 'utf8'), 'project is a file');
    assert.equal(await readFile(join(home, 'ptbk-projects'), 'utf8'), 'first alternative is a file');
    assert.equal(await readFile(join(home, 'ptbk-projects-2'), 'utf8'), 'second alternative is a file');
});

test('unavailable directory links select an alternative while usable redirected homes remain valid', async (t) => {
    const home = await temporaryDirectory(t, 'ptbk home links');
    await symlink(join(home, 'missing-target'), join(home, 'ptbk'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(projectsRootForHome(home), join(home, 'ptbk-projects'));
    await mkdir(join(home, 'missing-target'));
    assert.equal(projectsRootForHome(home), join(home, 'ptbk', 'project'));
});
