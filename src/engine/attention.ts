import type { DashboardDomain, DomainAttention, ServiceSnapshot } from './snapshot.js';

/**
 * Every dashboard domain that can need the operator's attention.
 */
const DOMAINS: readonly DashboardDomain[] = ['work', 'health', 'wallet', 'chats', 'tasks', 'tools', 'sync'];

/**
 * Whether one domain needs a concrete human decision, input or action now, derived from its own state. Failures,
 * warnings, completed results, unread history and repairs in progress stay inspectable on their pages without
 * attention. `key` identifies the current requests, so a changed key is a new request for every viewer.
 */
function attentionOf(snapshot: Omit<ServiceSnapshot, 'attention'>, domain: DashboardDomain): DomainAttention | undefined {
    switch (domain) {
        case 'work': {
            const blockers = snapshot.blockers.filter((blocker) => !blocker.automatic && blocker.kind !== 'recovery');
            return blockers.length ? { key: blockers.map((blocker) => `${blocker.kind}:${blocker.title}`).join('|'), tone: 'error' } : undefined;
        }
        case 'health': {
            const incidents = (snapshot.health?.incidents ?? []).filter((incident) => incident.needsAction);
            if (!incidents.length) return undefined;
            return { key: incidents.map((incident) => incident.id).join('|'), tone: incidents.some((incident) => incident.severity === 'hard') ? 'error' : 'warning' };
        }
        case 'wallet': {
            // Pending login requests (protected input) and a Wallet this host cannot unlock while it has logins.
            const wallet = snapshot.wallet;
            if (!wallet) return undefined;
            const items = [...wallet.pending.map((action) => `request:${action.id}:${action.problem}`), ...(wallet.state === 'locked' || (wallet.state === 'unavailable' && wallet.problem) ? [`${wallet.state}:${wallet.problem ?? ''}`] : [])];
            return items.length ? { key: items.join('|'), tone: wallet.state === 'unavailable' ? 'error' : 'warning' } : undefined;
        }
        case 'chats':
            return snapshot.chats.waiting.length ? { key: snapshot.chats.waiting.map((chat) => `${chat.name}:${chat.messages}`).join('|'), tone: 'warning' } : undefined;
        case 'tasks': {
            // A task question is a genuine human request, conspicuous whatever the task's purpose; failed or
            // recovering tasks are inspectable history and repair, not questions.
            const asking = snapshot.queue.filter((item) => item.readiness === 'awaiting-user');
            return asking.length ? { key: asking.map((item) => `${item.ref}:${item.readiness}`).join('|'), tone: 'warning' } : undefined;
        }
        case 'tools': {
            // Only what a person must do: no usable tool without a known recheck (sign in, enable or add one), or a
            // browser whose automatic recovery is exhausted. Tool records with problems go to Fixer.
            const blocked = [...(snapshot.browsers ?? []), ...(snapshot.browser && !snapshot.browsers?.length ? [snapshot.browser] : [])].filter((browser) => browser.recovery?.state === 'blocked');
            const requests = [...(snapshot.tools?.waiting && !snapshot.tools.waiting.automatic ? [`waiting:${snapshot.tools.waiting.reason}`] : []), ...blocked.map((browser) => `browser:${browser.name}:${browser.lastFailure?.at ?? ''}`)];
            return requests.length ? { key: requests.join('|'), tone: blocked.length ? 'error' : 'warning' } : undefined;
        }
        case 'sync':
            // A conflict goes to Fixer and failed attempts retry with backoff; a missing destination needs a person.
            return snapshot.sync?.state === 'unconfigured' ? { key: `${snapshot.sync.state}:${snapshot.sync.reason ?? ''}`, tone: 'warning' } : undefined;
        default:
            return undefined;
    }
}

/**
 * The shared per-domain attention of a snapshot (one source of truth for terminal and browser dashboards). Whether a
 * viewer has noticed it is viewer-local presentation state, never part of this.
 *
 * @private dashboard attention
 */
export function domainAttention(snapshot: Omit<ServiceSnapshot, 'attention'>): Partial<Record<DashboardDomain, DomainAttention>> {
    const attention: Partial<Record<DashboardDomain, DomainAttention>> = {};
    for (const domain of DOMAINS) {
        const item = attentionOf(snapshot, domain);
        if (item) attention[domain] = item;
    }
    return attention;
}
