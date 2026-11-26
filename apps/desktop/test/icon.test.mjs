import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { test } from 'node:test';
import { createWindowsIcons } from '../windows-icons.cjs';

test('the Windows title bar and notification area select artwork for both app and shell themes', () => {
    for (const [appDark, shellDark, window, tray] of [
        [false, false, 'promptbook-blue.ico', 'promptbook-blue.ico'],
        [true, true, 'promptbook-white.ico', 'promptbook-white.ico'],
        [true, false, 'promptbook.ico', 'promptbook-blue.ico'],
        [false, true, 'promptbook.ico', 'promptbook-white.ico'],
    ]) {
        const theme = { shouldUseDarkColors: appDark, shouldUseDarkColorsForSystemIntegratedUI: shellDark };
        const icons = createWindowsIcons('icons', theme);
        assert.deepEqual(icons.current(), { window: join('icons', window), tray: join('icons', tray) });
    }
});

test('theme changes update the tray and all surviving windows without reloading identical icons', () => {
    const theme = { shouldUseDarkColors: false, shouldUseDarkColorsForSystemIntegratedUI: false };
    const icons = createWindowsIcons('icons', theme);
    const trayUpdates = [];
    const tray = { setImage: (file) => trayUpdates.push(basename(file)) };
    const windowUpdates = [[], []];
    const entries = windowUpdates.map((updates) => ({
        window: { isDestroyed: () => false, setIcon: (file) => updates.push(basename(file)) },
    }));
    entries.push({ window: { isDestroyed: () => true, setIcon: () => assert.fail('closed window') } });

    icons.refresh(tray, []); // The controller may start with only the tray.
    theme.shouldUseDarkColorsForSystemIntegratedUI = true;
    icons.refresh(tray, entries);
    theme.shouldUseDarkColors = true;
    icons.refresh(tray, entries);
    icons.refresh(tray, entries);
    theme.shouldUseDarkColors = theme.shouldUseDarkColorsForSystemIntegratedUI = false;
    icons.refresh(tray, entries);

    assert.deepEqual(trayUpdates, ['promptbook-blue.ico', 'promptbook-white.ico', 'promptbook-blue.ico']);
    for (const updates of windowUpdates) {
        assert.deepEqual(updates, ['promptbook.ico', 'promptbook-white.ico', 'promptbook-blue.ico']);
    }
});

test('the executable and runtime icons include transparent PNG frames at Windows taskbar and display scales', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
    assert.equal(manifest.build.win.icon, 'icons/promptbook.ico');
    assert.ok(manifest.build.win.extraResources.some(({ from, to }) => from === 'icons' && to === 'icons'));

    for (const name of ['promptbook', 'promptbook-blue', 'promptbook-white']) {
        const data = await readFile(new URL('../icons/' + name + '.ico', import.meta.url));
        assert.equal(data.readUInt16LE(2), 1);
        const widths = [];
        for (let i = 0; i < data.readUInt16LE(4); i++) {
            const entry = 6 + 16 * i;
            const size = data[entry] || 256;
            const offset = data.readUInt32LE(entry + 12);
            const frame = data.subarray(offset, offset + data.readUInt32LE(entry + 8));
            assert.equal(frame.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
            assert.equal(frame.readUInt32BE(16), size);
            assert.equal(frame.readUInt32BE(20), size);
            assert.equal(frame[25], 6); // PNG truecolor with alpha.
            widths.push(size);
        }
        assert.deepEqual(widths, [16, 20, 24, 32, 40, 48, 64, 128, 256]);
    }
});
