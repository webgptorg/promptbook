import { EXIT, PtbkError } from '../../common/errors.js';
import { AuthStore } from '../../service/auth.js';
import { lookupService } from '../../service/control.js';
import { renderQr } from '../../ui/status-view.js';
import { printJson, selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * `ptbk access pair`: show the existing (or explicitly renewed) single-use pairing link — a trusted local action.
 *
 * @private command
 */
export async function pair(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const lookup = await lookupService(project);
    if (lookup.state !== 'running') throw new PtbkError('Pairing needs the running service with its HTTP server.', { kind: 'not-found', next: ['Run `ptbk start` first.'] });
    const pairing = await lookup.client.request<{ available: boolean; url?: string; expiresAt?: string; remote?: boolean; reason?: string }>('pairing', { renew: flag(context, 'renew') === true });
    const { terminal } = context;
    if (!pairing.available || !pairing.url) {
        terminal.write(`${pairing.reason ?? 'No unused pairing link exists.'} Run \`ptbk access pair --renew\`.\n`);
        return EXIT.incomplete;
    }
    terminal.write(`${flag(context, 'renew') ? 'New pairing link' : 'Pairing link'} (single use, expires ${pairing.expiresAt}; keep it secret):\n${pairing.url}\n`);
    if (!pairing.remote) terminal.write('Remote access is not ready, so this link only works on this computer.\n');
    if (terminal.pretty && flag(context, 'qr') !== false) terminal.write(`${(await renderQr(pairing.url)).join('\n')}\n`);
    return EXIT.success;
}

/**
 * `ptbk access devices`: list paired device sessions.
 *
 * @private command
 */
export async function devices(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const sessions = await new AuthStore(project).sessions();
    if (flag(context, 'json')) printJson(sessions.map(({ id, label, createdAt, lastSeenAt, expiresAt, revokedAt }) => ({ id, label, createdAt, lastSeenAt, expiresAt, revokedAt })));
    else if (!sessions.length) context.terminal.write('No paired devices.\n');
    else for (const session of sessions) context.terminal.write(`${session.id}  ${session.revokedAt ? 'revoked' : session.expiresAt < Date.now() ? 'expired' : 'active'}  ${new Date(session.createdAt).toISOString()}  ${session.label}\n`);
    return EXIT.success;
}

/**
 * `ptbk access revoke`: revoke one or all paired devices.
 *
 * @private command
 */
export async function revoke(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const [id] = context.positionals;
    if (!id && !flag(context, 'all')) throw new PtbkError('Name a device or use --all.', { kind: 'usage', next: ['Run `ptbk access devices`.'] });
    const count = await new AuthStore(project).revokeSessions(flag(context, 'all') ? 'all' : id!);
    context.terminal.write(`Revoked ${count} device session(s).\n`);
    return count ? EXIT.success : EXIT.incomplete;
}

/**
 * `ptbk access token`: issue (or revoke) a project-scoped API token.
 *
 * @private command
 */
export async function token(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const store = new AuthStore(project);
    const revokeId = option<string>(context, 'revoke');
    if (revokeId) {
        const revoked = await store.revokeApiToken(revokeId);
        context.terminal.write(revoked ? `Revoked ${revokeId}.\n` : `No active token ${revokeId}.\n`);
        return revoked ? EXIT.success : EXIT.incomplete;
    }
    const created = await store.createApiToken(context.positionals[0] ?? 'api client');
    context.terminal.write(`API token ${created.id} (shown once; send as "Authorization: Bearer <token>"):\n${created.token}\n`);
    return EXIT.success;
}
