import encodeQR from 'qr';
import type { SetupLinkOutcome } from '../app/connection.js';
import { openInBrowser } from '../common/open-url.js';
import type { CommandContext } from './context.js';
import { flag } from './context.js';

/** A setup secret may open a browser only on the same local desktop. @private owner setup */
export function localSetupBrowser(env: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): boolean {
    if (env.PTBK_NO_OPEN === '1' || env.PTBK_LOGIN_LOCATION === 'remote' || env.SSH_CONNECTION || env.SSH_TTY || env.SSH_CLIENT) return false;
    return platform === 'darwin' || (platform === 'linux' && Boolean(env.DISPLAY || env.WAYLAND_DISPLAY));
}

/**
 * Shows the owner secret only on the requesting terminal. This never uses an engine logger or a dashboard snapshot.
 * Browser launch failure leaves the printable link usable.
 * @private owner setup
 */
export async function showOwnerSetup(context: CommandContext, setup: Extract<SetupLinkOutcome, { kind: 'issued' }>, reset = false): Promise<void> {
    const { terminal } = context;
    if (!terminal.interactive) return;
    terminal.write(`\n${terminal.style.bold(reset ? 'Owner reset: set up access again' : 'Owner setup link')}\n`);
    terminal.write(`Open this one-time link before ${new Date(setup.expiresAt).toLocaleTimeString()}. Whoever uses it first becomes the owner.\n\n${setup.url}\n\n`);
    terminal.write(encodeQR(setup.url, 'ascii', { border: 4 }) + '\n');
    terminal.write(`Before creating the passkey, check engine ${setup.engineId} and fingerprint ${setup.fingerprint}.\n`);
    if (flag(context, 'open') !== false && localSetupBrowser(context.env)) await openInBrowser(setup.url, context.env);
}
