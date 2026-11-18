import type { HarnessEvent } from '../harness/types.js';

/** A bounded, display-only step of a reply, independent of its readable progress body. @private chats */
export type ReplyStep = { readonly kind: 'reasoning' | 'tool' | 'note'; readonly tool: string | null; readonly text: string; readonly level: 'info' | 'warning' | 'error' };

/** Normalizes a step after redacting bridge secrets, before either live display or persistence. @private chats */
export function replyStep(step: ReplyStep, redact: (text: string) => string = text => text): ReplyStep {
    const flat = (text: string, limit: number): string => redact(text).replace(/\s+/g, ' ').trim().slice(0, limit);
    const tool = step.kind === 'tool' ? flat(step.tool ?? '', 128) : null;
    return { kind: step.kind === 'tool' && !tool ? 'note' : step.kind, tool: tool || null, text: flat(step.text, 500), level: step.level };
}

/** Converts only activity events; streamed reply text never becomes a step. @private chats */
export function stepOfEvent(event: HarnessEvent, redact?: (text: string) => string): ReplyStep | undefined {
    if (event.type === 'activity') return replyStep(event.tool ? { kind: 'tool', tool: event.tool, text: event.detail ?? '', level: 'info' } : { kind: 'note', tool: null, text: event.text, level: /^command exited with [1-9]\d*$/.test(event.text) ? 'warning' : 'info' }, redact);
    if (event.type === 'reasoning') return replyStep({ kind: 'reasoning', tool: null, text: event.text, level: 'info' }, redact);
    if (event.type === 'error' || event.type === 'turn-failed') return replyStep({ kind: 'note', tool: null, text: event.text, level: event.type === 'error' ? 'warning' : 'error' }, redact);
    return undefined;
}

/** Validates saved metadata; invalid records fall back to the historical readable body. @private chats */
export function parseReplySteps(value: string): readonly ReplyStep[] | undefined {
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { return undefined; }
    if (!Array.isArray(parsed) || parsed.some(step => !step || typeof step !== 'object' || !['reasoning', 'tool', 'note'].includes(step.kind) || !['info', 'warning', 'error'].includes(step.level) || typeof step.text !== 'string' || (step.kind === 'tool' ? typeof step.tool !== 'string' || !step.tool.trim() : step.tool !== null) || Object.keys(step).some(key => !['kind', 'tool', 'text', 'level'].includes(key)))) return undefined;
    return parsed.slice(-200).map(step => replyStep(step as ReplyStep));
}

/** Recovers pre-metadata progress without interpreting streamed text after the first blank line. @private chats */
export function legacyReplySteps(text: string): readonly ReplyStep[] {
    const steps: ReplyStep[] = [];
    for (const line of text.split('\n')) {
        if (!line.startsWith('- ')) break;
        const body = line.slice(2);
        const tool = /^(mcp__\S+|[A-Z][A-Za-z]+)(?:\s+(.*))?$/.exec(body);
        steps.push(replyStep(body.startsWith('thinking: ') ? { kind: 'reasoning', tool: null, text: body.slice(10), level: 'info' } : tool ? { kind: 'tool', tool: tool[1]!, text: tool[2] ?? '', level: 'info' } : { kind: 'note', tool: null, text: body, level: 'info' }));
    }
    const unfinished = /(?:^|\n\n)\(unfinished reply: ([\s\S]*)\)\s*$/.exec(text);
    if (unfinished) steps.push(replyStep({ kind: 'note', tool: null, text: unfinished[1]!, level: 'error' }));
    return steps.slice(-200);
}
