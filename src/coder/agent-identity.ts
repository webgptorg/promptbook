import { relative } from 'node:path';
import { createHash } from 'node:crypto';
import { normalizeAgentName, nonAgentReference, type AgentDefinition } from './agents.js';

/** Offline artwork derived solely from an agent's canonical identity. @private */
export interface AgentVisualIdentity { id: string; name: string; color: string; pattern: number[]; symbol: string; }

/** Generate a mirrored geometric face shared by every presentation, without affecting routing. @private */
export function agentVisualIdentity(name: string): AgentVisualIdentity {
    const canonical = nonAgentReference(name)?.name ?? name;
    const id = normalizeAgentName(canonical);
    const hash = createHash('sha256').update(`ptbk-avatar-v1:${id}`).digest();
    const pattern = Array.from({ length: 25 }, (_, index) => (hash[Math.floor(index / 5) * 3 + Math.min(index % 5, 4 - index % 5)]! & 1));
    pattern[12] = 1;
    const colors = ['#2563a6', '#9343a0', '#28764c', '#a04b23', '#7954b3', '#257c87'];
    const marks = ['+', 'x', 'o', '*', ':', '='];
    return { id, name: canonical, color: colors[hash[16]! % colors.length]!, pattern,
        symbol: `[${[17, 18, 19].map(index => marks[hash[index]! % marks.length]).join('')}]` };
}

/** Truthful activity labels are independent of appearance and never turn Void into a worker. @private */
export function agentActivity(state: Record<string, any>): string {
    if (state.currentSelection?.visualIdentity?.id === 'void') return 'Idle';
    if (state.requests?.some((request: Record<string, any>) => request.taskId === state.currentTask && state.currentTask)) return 'Waiting for User';
    if (['stopped', 'completed', 'interrupted', 'disconnected'].includes(state.status) || state.connection === 'disconnected') return 'Idle';
    if (state.paused && !state.running) return 'Paused';
    if (['blocked', 'failed', 'recovery-required', 'setup-required', 'sync-pending'].includes(state.status)) return 'Blocked / failed';
    if (state.waiting) return state.running ? 'Waiting for provider / pacing' : 'Waiting between prompts';
    if (state.currentTask && state.running) return state.phase === 'checking' ? 'Checking' : 'Working';
    return 'Idle';
}

/** Attach display identities to observed references while retaining their exact execution values. @private */
export function identifyRuntime(state: Record<string, any>, agents: AgentDefinition[] = []): Record<string, any> {
    /** Resolve file references through the discovered Book name; paths and Book bytes are never identity seeds. */
    const identity = (reference?: string, name?: string): AgentVisualIdentity | undefined => {
        if (name) return agentVisualIdentity(name);
        if (!reference) return undefined;
        const special = nonAgentReference(reference);
        if (special) return agentVisualIdentity(special.name);
        const agent = agents.find(candidate => candidate.path === reference || candidate.normalizedName === normalizeAgentName(reference));
        if (agent) return agentVisualIdentity(agent.name);
        return /[\\/]|\.book$|^https?:/.test(reference) ? undefined : agentVisualIdentity(reference);
    };
    /** Preserve historical attribution rather than assigning old messages to the currently active worker. */
    const event = (entry: Record<string, any>) => ({ ...entry, visualIdentity: identity(entry.agent, entry.agentName) });
    const selection = state.currentSelection;
    const currentSelection = selection ? { ...selection, visualIdentity: identity(selection.agent, selection.agentName) } : undefined;
    const result = { ...state, observedAt: Date.now(), currentSelection,
        agents: agents.map(agent => ({ name: agent.name, hidden: agent.hidden, path: relative(state.project ?? '.', agent.path), visualIdentity: agentVisualIdentity(agent.name) })).concat([{ name: 'Expert', hidden: true, path: 'ptbk:expert', visualIdentity: agentVisualIdentity('Expert') }]),
        tasks: (state.tasks ?? []).map((task: Record<string, any>) => ({ ...task, visualIdentity: identity(task.agent, task.agentName) })),
        requests: (state.requests ?? []).map((request: Record<string, any>) => ({ ...request, visualIdentity: agentVisualIdentity('User') })),
        events: (state.events ?? []).map(event),
        ...(state.lastResult ? { lastResult: { ...state.lastResult, events: (state.lastResult.events ?? []).map(event) } } : {}),
    };
    return { ...result, activity: agentActivity(result) };
}
