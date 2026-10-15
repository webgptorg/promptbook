import { PtbkError } from '../common/errors.js';
import { redact } from '../common/redact.js';
import { ENGINE_VERSION } from '../common/version.js';
import { stringWidth, wrap } from './ansi.js';
import { renderPanel } from './panels.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Human label of an error kind's next-step class.
 */
const KIND_LABEL: Readonly<Record<string, string>> = {
    usage: 'Invalid invocation',
    setup: 'Setup required',
    configuration: 'Configuration error',
    authentication: 'Authentication required',
    quota: 'Provider quota reached',
    technical: 'Technical failure',
    persistence: 'Persistence failure',
    conflict: 'Unsafe state',
    'not-found': 'Not found',
    unsupported: 'Unsupported',
    cancelled: 'Cancelled',
    incomplete: 'Incomplete',
    internal: 'Internal error',
};

/**
 * Converts any failure into labeled fact rows (shared by pretty and raw output).
 *
 * @private error experience
 */
export function errorFacts(error: unknown): { title: string; kind: string; rows: Array<[string, string]>; next: string[] } {
    const structured =
        error instanceof PtbkError
            ? error
            : new PtbkError(error instanceof Error ? error.message : String(error), {
                  kind: 'internal',
                  reason: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 6).join('\n') : undefined,
                  next: ['This is unexpected; please report it with the details above.'],
              });
    const details = structured.details;
    const rows: Array<[string, string]> = [];
    if (details.phase) rows.push(['Failed step', details.phase]);
    if (details.project) rows.push(['Project', details.project]);
    if (details.task) rows.push(['Task', details.task]);
    if (details.harness) rows.push(['Harness', details.harness]);
    rows.push(['Cause', details.reason ? redact(details.reason) : 'Unknown (no cause was reported)']);
    if (details.effect) rows.push(['Effect', details.effect]);
    if (details.preserved) rows.push(['Preserved', details.preserved]);
    if (details.trace) rows.push(['Diagnostics', details.trace]);
    rows.push(['Engine', `ptbk ${ENGINE_VERSION}`]);
    return { title: redact(structured.message), kind: KIND_LABEL[details.kind] ?? details.kind, rows, next: [...(details.next ?? [])] };
}

/**
 * Renders an error for the terminal (pretty panel) or as plain text (raw).
 *
 * @private error experience
 */
export function renderError(error: unknown, terminal: TerminalProfile): string {
    const facts = errorFacts(error);
    if (!terminal.pretty) {
        const lines = [`Error: ${facts.title}`, `Kind: ${facts.kind}`, ...facts.rows.map(([label, value]) => `${label}: ${value.replace(/\n/g, '\n  ')}`)];
        if (facts.next.length) lines.push('Next:', ...facts.next.map((step) => `  - ${step}`));
        return `${lines.join('\n')}\n`;
    }
    const { style } = terminal;
    const width = Math.min(terminal.columns(), 100);
    const inner = width - 4;
    const labelWidth = Math.max(...facts.rows.map(([label]) => stringWidth(label)));
    const lines: string[] = [style.bold(style.error(facts.title)), ''];
    for (const [label, value] of facts.rows) {
        const wrapped = wrap(value, Math.max(10, inner - labelWidth - 2));
        wrapped.forEach((line, index) => lines.push(`${index === 0 ? style.muted(label.padEnd(labelWidth)) : ' '.repeat(labelWidth)}  ${line}`));
    }
    if (facts.next.length) {
        lines.push('', style.bold('What you can do'));
        const mark = symbols(terminal.unicode).arrow;
        for (const step of facts.next) wrap(step, inner - 3).forEach((line, index) => lines.push(`${index === 0 ? style.accent(mark) : ' '.repeat(stringWidth(mark))} ${line}`));
    }
    return `${renderPanel({ title: `${symbols(terminal.unicode).fail} ${facts.kind}`, lines, width, tone: 'error', unicode: terminal.unicode, style }).join('\n')}\n`;
}
