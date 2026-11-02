import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { windowsIcon } from '../icon.mjs';

test('the Windows application icon has the required 256px image and preserves the actual logo bytes', async () => {
    const logo = await readFile(new URL('../../../design/logo-blue-transparent-256.png', import.meta.url));
    const icon = windowsIcon(logo);
    assert.equal(icon.readUInt16LE(2), 1);
    assert.equal(icon.readUInt16LE(4), 1);
    assert.equal(icon[6], 0);
    assert.equal(icon[7], 0);
    assert.equal(icon.readUInt32LE(14), logo.length);
    assert.equal(icon.readUInt32LE(18), 22);
    assert.deepEqual(icon.subarray(22), logo);
    assert.throws(() => windowsIcon(Buffer.from('not an image')));
});
