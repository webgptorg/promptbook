import {
    type CoderOutputEvent,
    type CoderOutputRecord,
    outputRecord,
    outputRecords,
    outputText,
} from './CoderOutputEvent';

/** Protocol bookkeeping that carries no user-facing text. Unknown records always fall back visibly. */
const BOOKKEEPING_TYPES = new Set(['message_stop', 'content_block_stop', 'ping']);

/** Per-stream message identity for Claude's indexed content blocks. */
export type CoderOutputRecordContext = {
    messageId: string;
    sequence: number;
};

/** Projects known harness envelopes into display events, without making execution decisions. */
export function normalizeCoderOutputRecord(
    record: CoderOutputRecord,
    context: CoderOutputRecordContext,
): CoderOutputEvent[] | undefined {
    const events = normalizeKnownRecord(record, context);
    if (events === undefined) return undefined;

    // A known envelope may acquire diagnostic fields in a newer harness version. Keep those visible too.
    const errors = [record.error, ...(Array.isArray(record.errors) ? record.errors : [record.errors])];
    for (const error of errors) {
        if (!error) continue;
        const text = errorText(error);
        if (text && !events.some((event) => event.kind === 'error' && event.text.includes(text))) {
            events.push({ kind: 'error', title: 'Harness failure', text });
        }
    }
    return events;
}

/** Reads only documented shapes already consumed or emitted by the local harness adapters. */
function normalizeKnownRecord(
    record: CoderOutputRecord,
    context: CoderOutputRecordContext,
): CoderOutputEvent[] | undefined {
    const type = outputText(record.type);
    if (type.startsWith('team_')) return normalizeTeamRecord(record);
    if (type.startsWith('item.')) return normalizeCodexItem(record);
    if (type === 'stream_event') return normalizeClaudeStream(outputRecord(record.event), context);
    if (type === 'assistant' || type === 'user') return normalizeClaudeMessage(record, context);
    if (type === 'result') {
        if (typeof record.result !== 'string' && !record.is_error && !record.error && !record.errors) {
            // Another harness may use the same type name with a different payload. Do not discard its answer.
            return undefined;
        }
        return [
            {
                kind: record.is_error ? 'error' : 'result',
                title: record.is_error ? 'Harness failure' : 'Result',
                text:
                    [
                        formatOutputValue(record.result),
                        errorText(record.error),
                        ...(Array.isArray(record.errors) ? record.errors.map(errorText) : [errorText(record.errors)]),
                    ]
                        .filter(Boolean)
                        .join('\n') ||
                    formatOutputValue(record.errors) ||
                    outputText(record.subtype),
            },
        ];
    }
    if (type === 'error' || type === 'turn.failed')
        return [
            {
                kind: 'error',
                title: 'Harness failure',
                text: errorText(record.error) || outputText(record.message) || formatOutputValue(record),
            },
        ];
    if (type === 'warning')
        return [
            {
                kind: 'warning',
                title: 'Harness warning',
                text: outputText(record.message) || formatOutputValue(record),
            },
        ];
    if (type === 'thread.started' || type === 'turn.started' || type === 'turn.completed')
        return [{ kind: 'status', title: 'Harness', text: type.replace('.', ' ') }];
    if (type === 'system' && record.subtype === 'init')
        return [{ kind: 'status', title: 'Harness initialized', text: outputText(record.model) }];
    if (type === 'rate_limit_event') {
        const status = outputText(outputRecord(record.rate_limit_info).status);
        return [
            {
                kind: /rejected|warning/.test(status) ? 'warning' : 'status',
                title: 'Harness limit',
                text: formatOutputValue(record.rate_limit_info),
            },
        ];
    }
    // OpenCode's existing --format json stream.
    const part = outputRecord(record.part);
    if (type === 'text' && typeof part.text === 'string')
        return [{ id: outputText(part.id) || undefined, kind: 'agent', title: 'Agent', text: part.text }];
    if (type === 'tool_use' && part.tool)
        return [normalizeTool(outputText(part.id), outputText(part.tool), outputRecord(part.state))];
    if (type === 'step_start' || type === 'step_finish')
        return [{ kind: 'status', title: 'Harness', text: type.replace('_', ' ') }];
    // Some non-streaming adapters report a single response instead of message envelopes.
    if (typeof record.response === 'string') return [{ kind: 'agent', title: 'Agent', text: record.response }];
    if (type === 'assistant.message' && typeof outputRecord(record.data).content === 'string')
        return [{ kind: 'agent', title: 'Agent', text: outputText(outputRecord(record.data).content) }];
    return undefined;
}

/** Normalizes Codex item snapshots using their stable IDs instead of duplicating lifecycle envelopes. */
function normalizeCodexItem(record: CoderOutputRecord): CoderOutputEvent[] | undefined {
    const item = outputRecord(record.item);
    const id = outputText(item.id) || outputText(record.item_id) || undefined;
    const status =
        outputText(item.status).replace(/_/g, ' ') ||
        (record.type === 'item.completed' ? 'completed' : record.type === 'item.started' ? 'running' : 'reported');
    const exitCode = typeof item.exit_code === 'number' ? ` · exit ${item.exit_code}` : '';
    switch (item.type) {
        case 'agent_message':
        case 'reasoning':
            return [
                {
                    id,
                    kind: item.type === 'agent_message' ? 'agent' : 'reasoning',
                    title: item.type === 'agent_message' ? 'Agent' : 'Harness reasoning',
                    text: outputText(item.text) || outputText(record.delta),
                    isDelta: record.type === 'item.delta',
                },
            ];
        case 'command_execution':
            return [
                {
                    id,
                    kind:
                        (typeof item.exit_code === 'number' && item.exit_code !== 0) || status === 'failed'
                            ? 'error'
                            : 'tool',
                    title: `Command · ${status}${exitCode}`,
                    text: [outputText(item.command), outputText(item.aggregated_output)].filter(Boolean).join('\n'),
                },
            ];
        case 'file_change':
            return [
                {
                    id,
                    kind: status === 'failed' ? 'error' : 'files',
                    title: `Reported file changes · ${status}`,
                    text: outputRecords(item.changes)
                        .map((change) => [outputText(change.kind), outputText(change.path)].filter(Boolean).join(' '))
                        .join('\n'),
                },
            ];
        case 'mcp_tool_call':
            return [
                {
                    id,
                    kind: item.error ? 'error' : 'tool',
                    title: `Tool · ${[item.server, item.tool, status].filter(Boolean).join(' · ')}`,
                    text: errorText(item.error) || formatOutputValue(item.result) || formatOutputValue(item.arguments),
                },
            ];
        case 'web_search':
            return [{ id, kind: 'tool', title: `Web search · ${status}`, text: outputText(item.query) }];
        case 'todo_list':
            return [
                {
                    id,
                    kind: 'status',
                    title: 'Reported plan',
                    text: outputRecords(item.items)
                        .map(
                            (entry) =>
                                `${
                                    entry.completed === true ? '[x]' : entry.completed === false ? '[ ]' : '[?]'
                                } ${outputText(entry.text)}`,
                        )
                        .join('\n'),
                },
            ];
        case 'error':
            return [{ id, kind: 'error', title: 'Harness failure', text: outputText(item.message) }];
        default:
            return undefined;
    }
}

/** Reassembles Claude text deltas while leaving partial tool JSON out of user-facing prose. */
function normalizeClaudeStream(
    record: CoderOutputRecord,
    context: CoderOutputRecordContext,
): CoderOutputEvent[] | undefined {
    const type = outputText(record.type);
    if (record.error) return [{ kind: 'error', title: 'Harness failure', text: errorText(record.error) }];
    if (type === 'message_start') {
        context.messageId = outputText(outputRecord(record.message).id) || `message-${++context.sequence}`;
        return [];
    }
    const index = typeof record.index === 'number' ? record.index : 0;
    const id = `${context.messageId}:${index}`;
    if (type === 'content_block_start') {
        const block = outputRecord(record.content_block);
        if (block.type === 'text') return [{ id, kind: 'agent', title: 'Agent', text: outputText(block.text) }];
        if (block.type === 'thinking')
            return [{ id, kind: 'reasoning', title: 'Harness reasoning', text: outputText(block.thinking) }];
        if (block.type === 'tool_use') {
            return [
                normalizeTool(outputText(block.id), outputText(block.name), { input: block.input, status: 'running' }),
            ];
        }
    }
    if (type === 'content_block_delta') {
        const delta = outputRecord(record.delta);
        if (delta.type === 'input_json_delta' || delta.type === 'signature_delta') return [];
        if (delta.type === 'text_delta' || delta.type === 'thinking_delta')
            return [
                {
                    id,
                    kind: delta.type === 'text_delta' ? 'agent' : 'reasoning',
                    title: delta.type === 'text_delta' ? 'Agent' : 'Harness reasoning',
                    text: outputText(delta.text) || outputText(delta.thinking),
                    isDelta: true,
                },
            ];
    }
    if (BOOKKEEPING_TYPES.has(type) || (type === 'message_delta' && !record.error)) return [];
    return undefined;
}

/** Normalizes complete Claude messages and command results, sharing IDs with streamed blocks. */
function normalizeClaudeMessage(
    record: CoderOutputRecord,
    context: CoderOutputRecordContext,
): CoderOutputEvent[] | undefined {
    const message = outputRecord(record.message);
    if (!Array.isArray(message.content)) return undefined;
    return outputRecords(message.content).map((block, index): CoderOutputEvent => {
        const id = `${outputText(message.id) || context.messageId}:${index}`;
        if (block.type === 'text')
            return {
                id,
                kind: record.type === 'assistant' ? 'agent' : 'status',
                title: record.type === 'assistant' ? 'Agent' : 'User message',
                text: outputText(block.text),
            };
        if (block.type === 'thinking')
            return { id, kind: 'reasoning', title: 'Harness reasoning', text: outputText(block.thinking) };
        if (block.type === 'tool_use')
            return normalizeTool(outputText(block.id), outputText(block.name), {
                input: block.input,
                status: 'running',
            });
        if (block.type === 'tool_result')
            return {
                id: outputText(block.tool_use_id) || undefined,
                kind: block.is_error ? 'error' : 'tool',
                title: block.is_error ? 'Tool · failed' : 'Tool · completed',
                text:
                    typeof block.content === 'string'
                        ? block.content
                        : outputRecords(block.content)
                              .map((content) => outputText(content.text) || formatOutputValue(content))
                              .join('\n'),
            };
        return {
            kind: 'unknown',
            title: `Unrecognized content · ${outputText(block.type)}`,
            text: formatOutputValue(block),
        };
    });
}

/** Keeps tool names, command arguments and file paths compact, without claiming a change before a result. */
function normalizeTool(id: string, name: string, state: CoderOutputRecord): CoderOutputEvent {
    const input = outputRecord(state.input);
    const details =
        outputText(input.command) || outputText(input.file_path) || outputText(input.path) || formatOutputValue(input);
    const isFailure = Boolean(state.error) || state.status === 'error' || state.status === 'failed';
    const isFileChange =
        !isFailure && state.status === 'completed' && /^(Edit|Write|MultiEdit|apply_patch)$/i.test(name);
    return {
        id: id || undefined,
        kind: isFailure ? 'error' : isFileChange ? 'files' : 'tool',
        title: `${isFileChange ? 'Reported file changes' : 'Tool'} · ${name} · ${
            outputText(state.status) || 'reported'
        }`,
        text: [details, outputText(state.output), errorText(state.error)].filter(Boolean).join('\n'),
    };
}

/** Attributes the existing TEAM trace transport without initiating any teammate work. */
function normalizeTeamRecord(record: CoderOutputRecord): CoderOutputEvent[] {
    const data = outputRecord(record.data);
    const agent = outputText(record.agent) || 'Teammate';
    const label = outputText(record.type).replace('team_', '');
    return [
        {
            kind: data.error ? 'error' : record.type === 'team_result' ? 'agent' : 'status',
            title: `${agent} · TEAM ${label}`,
            text:
                errorText(data.error) ||
                outputText(data.response) ||
                outputText(data.message) ||
                outputText(data.request) ||
                formatOutputValue(record.data),
        },
    ];
}

/** Displays supplied data as data, never as invented narration. */
export function formatOutputValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/** Reads known error envelopes without losing errors of an unfamiliar shape. */
function errorText(value: unknown): string {
    return outputText(outputRecord(value).message) || formatOutputValue(value);
}
