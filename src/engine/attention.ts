import type { DashboardDomain, DomainAttention, ServiceSnapshot } from './snapshot.js';

/**
 * Every dashboard domain that can need the operator's attention.
 */
const DOMAINS: readonly DashboardDomain[] = ['work', 'system', 'health', 'chats', 'tasks', 'agents', 'tools', 'results', 'connection', 'sync'];

/**
 * Whether one domain has a new actionable event, failure, warning or human request, derived from its own state.
 * `key` identifies the current actionable items, so a changed key is a new event for every viewer.
 */
function attentionOf(snapshot: Omit<ServiceSnapshot, 'attention'>, domain: DashboardDomain): DomainAttention | undefined {
    switch (domain) {
        case 'work':
            return snapshot.blockers.length ? { key: snapshot.blockers.map((blocker) => `${blocker.kind}:${blocker.title}`).join('|'), tone: 'error' } : undefined;
        case 'system':
            return snapshot.configuration?.pending ? { key: `configuration:${snapshot.configuration.pending}`, tone: 'warning' } : undefined;
        case 'health': {
            const incidents = snapshot.health?.incidents ?? [];
            if (!incidents.length) return undefined;
            return { key: incidents.map((incident) => incident.id).join('|'), tone: incidents.some((incident) => incident.severity === 'hard') ? 'error' : 'warning' };
        }
        case 'chats':
            return snapshot.chats.waiting.length ? { key: snapshot.chats.waiting.map((chat) => `${chat.name}:${chat.messages}`).join('|'), tone: 'warning' } : undefined;
        case 'tasks': {
            const stuck = snapshot.queue.filter((item) => ['needs-recovery', 'failed'].includes(item.readiness));
            return stuck.length ? { key: stuck.map((item) => `${item.ref}:${item.readiness}`).join('|'), tone: 'warning' } : undefined;
        }
        case 'tools': {
            const failing = [...(snapshot.browsers ?? []), ...(snapshot.browser && !snapshot.browsers?.length ? [snapshot.browser] : [])].filter((browser) => browser.state === 'failed' || browser.recovery?.state === 'blocked');
            const problems = [...(snapshot.tools?.waiting ? [`waiting:${snapshot.tools.waiting.reason}`] : []), ...(snapshot.tools?.problems ?? []), ...failing.map((browser) => `browser:${browser.name}:${browser.lastFailure?.at ?? ''}`)];
            return problems.length ? { key: problems.join('|'), tone: failing.length ? 'error' : 'warning' } : undefined;
        }
        case 'results': {
            const error = snapshot.errors[snapshot.errors.length - 1];
            return error ? { key: `${error.at}:${error.summary}`, tone: 'warning' } : undefined;
        }
        case 'connection': {
            const remote = snapshot.connection.remote;
            return remote.state === 'failed' || remote.state === 'degraded' ? { key: `${remote.state}:${remote.error ?? ''}`, tone: 'warning' } : undefined;
        }
        case 'sync':
            return snapshot.sync && ['failed', 'conflict'].includes(snapshot.sync.state) ? { key: `${snapshot.sync.state}:${snapshot.sync.reason ?? ''}`, tone: snapshot.sync.state === 'conflict' ? 'error' : 'warning' } : undefined;
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
