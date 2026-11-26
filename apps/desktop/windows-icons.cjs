'use strict';
const { join } = require('node:path');

/** Selects the native artwork for the Windows shell and open windows, including mixed system/app themes. */
function createWindowsIcons(directory, theme) {
    const blue = join(directory, 'promptbook-blue.ico');
    const white = join(directory, 'promptbook-white.ico');
    const outlined = join(directory, 'promptbook.ico');
    let previous;

    /** A mixed theme needs one icon that works on both the title bar and taskbar. */
    function current() {
        const darkWindow = theme.shouldUseDarkColors;
        const darkShell = theme.shouldUseDarkColorsForSystemIntegratedUI ?? darkWindow;
        const tray = darkShell ? white : blue;
        // Windows can reuse a window's icon for its taskbar button.
        return { tray, window: darkWindow === darkShell ? tray : outlined };
    }

    /** Updates just the native surfaces whose selected image changed. */
    function refresh(tray, entries) {
        const next = current();
        if (previous?.tray !== next.tray) tray.setImage(next.tray);
        if (previous?.window !== next.window) {
            for (const { window } of entries) {
                if (!window.isDestroyed()) window.setIcon(next.window);
            }
        }
        previous = next;
    }

    return { current, refresh };
}

module.exports = { createWindowsIcons };
