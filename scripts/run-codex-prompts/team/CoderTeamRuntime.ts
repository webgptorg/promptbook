import { randomUUID } from 'crypto';
import { resolvePseudoAgentKindFromUrl } from '../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { ParseError } from '../../../src/errors/ParseError';
import { PipelineExecutionError } from '../../../src/errors/PipelineExecutionError';
import type { Usage } from '../../../src/execution/Usage';
import { addUsage } from '../../../src/execution/utils/addUsage';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import type { CoderTeamAgent, CoderTeammate } from './CoderTeamAgent';
import { CODER_TEAM_ARGUMENTS_SCHEMA } from './coderTeamProtocol';

/** Maximum answer retained in a tool result and trace. */
const MAX_ANSWER_LENGTH = 128_000;
/** Bounds match the planner's existing per-inference timeout. */
const CONSULTATION_TIMEOUT_MS = 5 * 60 * 1000;
/** Both depth and total calls are bounded, including concurrent sibling consultations. */
const MAX_TEAM_DEPTH = 4;
/** Session-wide limit prevents broad acyclic graphs from growing indefinitely. */
const MAX_TEAM_CALLS = 24;
/** Allow process-tree termination and final usage/log delivery without hanging on an uncooperative executor. */
const CLEANUP_TIMEOUT_MS = 5000;

/** An attributed tool result returned to the requesting Book, including failures. */
export type CoderTeamResult = {
    readonly sessionId: string;
    readonly taskId: string;
    readonly invocationId: string;
    readonly callerInvocationId: string;
    readonly teammate: { readonly label: string; readonly url?: string; readonly toolName: string };
    readonly request: string;
    readonly response: string;
    readonly error?: string;
};

/** Events use the existing runtime trace transport, without adding a UI or a second task queue. */
export type CoderTeamEvent = {
    readonly type: 'team_request' | 'team_result' | 'team_activity' | 'team_usage' | 'team_summary';
    readonly sessionId: string;
    readonly taskId: string;
    readonly invocationId: string;
    readonly callerInvocationId?: string;
    readonly agent: string;
    readonly data: unknown;
};

/** A model may invoke only tools declared by its current Book. Ancestry and permissions stay host-owned. */
export type CoderTeamScope = {
    readonly agent: CoderTeamAgent;
    readonly invocationId: string;
    readonly signal: AbortSignal;
    readonly call: (toolName: string, argumentsValue: unknown) => Promise<CoderTeamResult>;
    readonly activity: (data: unknown) => Promise<void>;
};

/** Inference receives the adviser's own Book and only the question/context selected by its caller. */
export type CoderTeamInference = {
    readonly scope: CoderTeamScope;
    readonly message: string;
    readonly context?: string;
    /** Report each raw inference once, including successful calls followed by malformed output. */
    readonly reportUsage: (usage: Usage) => void;
};

/** Shared executor contract for a coding harness or the host-mediated planning loop. */
export type CoderTeamExecutor = (request: CoderTeamInference) => Promise<{ answer: string; usage?: Usage }>;

/** A session-local delegation tree. No messages, answers, credentials or definitions are cached globally. */
export class CoderTeamRuntime {
    public readonly sessionId = randomUUID();
    public readonly root: CoderTeamScope;
    private readonly controller = new AbortController();
    private readonly usages: Usage[] = [];
    private callCount = 0;
    private readonly pending = new Set<Promise<CoderTeamResult>>();
    private readonly executions = new Set<Promise<string>>();
    private closing: Promise<void> | undefined;
    private isClosed = false;
    private readonly cancel = (): void => this.controller.abort(this.options.signal?.reason);

    /** Creates a runtime but performs no adviser inference until a tool is called. */
    public constructor(
        private readonly options: {
            readonly agent: CoderTeamAgent;
            readonly taskId: string;
            readonly execute: CoderTeamExecutor;
            readonly signal?: AbortSignal;
            readonly timeoutMs?: number;
            readonly onEvent?: (event: CoderTeamEvent) => void | Promise<void>;
        },
    ) {
        options.signal?.addEventListener('abort', this.cancel, { once: true });
        if (options.signal?.aborted) this.cancel();
        this.root = this.createScope(options.agent, [], randomUUID(), this.controller.signal);
    }

    /** Adds each actual adviser inference once; nested results never include their children's usage again. */
    public get usage(): Usage {
        return addUsage(...this.usages);
    }

    /** Revokes every outstanding child when the originating task ends, fails or is cancelled. */
    public close(): Promise<void> {
        this.closing ??= this.closeExecutions();
        return this.closing;
    }

    /** Drains cancellation once; late replies cannot mutate the finished session or its trace. */
    private async closeExecutions(): Promise<void> {
        this.controller.abort(new NotAllowed(spaceTrim('The originating TEAM task has ended.')));
        this.options.signal?.removeEventListener('abort', this.cancel);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            await Promise.race([
                Promise.allSettled([...this.pending, ...this.executions]),
                new Promise<void>((resolve) => {
                    timer = setTimeout(resolve, CLEANUP_TIMEOUT_MS);
                }),
            ]);
        } finally {
            clearTimeout(timer);
            this.isClosed = true;
        }
    }

    /** Creates an immutable capability view for one position in the delegation tree. */
    private createScope(
        agent: CoderTeamAgent,
        ancestors: ReadonlyArray<string>,
        invocationId: string,
        signal: AbortSignal,
    ): CoderTeamScope {
        return {
            agent,
            invocationId,
            signal,
            activity: (data) => this.emit('team_activity', invocationId, agent.name, data),
            call: (toolName, argumentsValue) => {
                const pending = this.consult(
                    agent,
                    [...ancestors, agent.url],
                    invocationId,
                    signal,
                    toolName,
                    argumentsValue,
                );
                this.pending.add(pending);
                void pending.then(
                    () => this.pending.delete(pending),
                    () => this.pending.delete(pending),
                );
                return pending;
            },
        };
    }

    /** Validates the call before loading a Book or starting any inference. */
    private async consult(
        caller: CoderTeamAgent,
        ancestors: ReadonlyArray<string>,
        callerInvocationId: string,
        signal: AbortSignal,
        toolName: string,
        argumentsValue: unknown,
    ): Promise<CoderTeamResult> {
        const invocationId = randomUUID();
        const teammate = caller.teammates.find(({ tool }) => tool.name === toolName);
        const identity = { label: teammate?.label || toolName, url: teammate?.url, toolName };
        let request = '';
        let response = '';
        let errorMessage: string | undefined;
        try {
            signal.throwIfAborted();
            if (!teammate)
                throw new NotAllowed(spaceTrim(`TEAM tool \`${toolName}\` is not declared by ${caller.name}.`));
            const argumentsObject = CODER_TEAM_ARGUMENTS_SCHEMA.parse(argumentsValue);
            request = argumentsObject.message;
            if (ancestors.includes(teammate.url))
                throw new NotAllowed(spaceTrim(`Cyclic TEAM consultation of ${teammate.label} was refused.`));
            if (ancestors.length > MAX_TEAM_DEPTH || ++this.callCount > MAX_TEAM_CALLS) {
                throw new NotAllowed(
                    spaceTrim('TEAM consultation limit reached. Return the available advice to the primary task.'),
                );
            }
            await this.emit(
                'team_request',
                invocationId,
                identity.label,
                {
                    caller: caller.name,
                    teammate: identity,
                    ...argumentsObject,
                },
                callerInvocationId,
            );
            response = await this.executeBounded(teammate, caller, ancestors, invocationId, signal, argumentsObject);
        } catch (error) {
            errorMessage = `${identity.label}: ${error instanceof Error ? error.message : String(error)}`;
        }
        const result: CoderTeamResult = {
            sessionId: this.sessionId,
            taskId: this.options.taskId,
            invocationId,
            callerInvocationId,
            teammate: identity,
            request,
            response,
            ...(errorMessage ? { error: errorMessage } : {}),
        };
        await this.emit('team_result', invocationId, identity.label, result, callerInvocationId);
        return result;
    }

    /** Links cancellation and timeout to the executor, including lazy remote Book resolution and nested calls. */
    private async executeBounded(
        teammate: CoderTeammate,
        caller: CoderTeamAgent,
        ancestors: ReadonlyArray<string>,
        invocationId: string,
        parentSignal: AbortSignal,
        argumentsObject: { message: string; context?: string },
    ): Promise<string> {
        const controller = new AbortController();
        const cancel = (): void => controller.abort(parentSignal.reason);
        parentSignal.addEventListener('abort', cancel, { once: true });
        if (parentSignal.aborted) cancel();
        const timeout = setTimeout(
            () =>
                controller.abort(
                    new PipelineExecutionError(spaceTrim(`TEAM consultation of ${teammate.label} timed out.`)),
                ),
            this.options.timeoutMs ?? CONSULTATION_TIMEOUT_MS,
        );
        let removeAbortListener = (): void => undefined;
        const execution = (async () => {
            controller.signal.throwIfAborted();
            const pseudoAgent = resolvePseudoAgentKindFromUrl(teammate.url);
            if (pseudoAgent === 'VOID') return 'The void remained silent.';
            if (pseudoAgent)
                throw new NotAllowed(
                    spaceTrim(`TEAM pseudo-agent ${pseudoAgent} has no consultation capability in Coder.`),
                );
            const agent = await caller.resolveTeammate(teammate.url, controller.signal);
            controller.signal.throwIfAborted();
            if (ancestors.includes(agent.url))
                throw new NotAllowed(spaceTrim(`Cyclic TEAM consultation of ${agent.name} was refused.`));
            return this.executeAgent(
                this.createScope(agent, ancestors, invocationId, controller.signal),
                argumentsObject,
            );
        })();
        this.executions.add(execution);
        void execution.then(
            () => this.executions.delete(execution),
            () => this.executions.delete(execution),
        );
        try {
            return await Promise.race([
                execution,
                new Promise<never>((_resolve, reject) => {
                    const abort = (): void =>
                        reject(controller.signal.reason || new NotAllowed(spaceTrim('TEAM cancelled.')));
                    removeAbortListener = () => controller.signal.removeEventListener('abort', abort);
                    controller.signal.addEventListener('abort', abort, { once: true });
                    if (controller.signal.aborted) abort();
                }),
            ]);
        } finally {
            clearTimeout(timeout);
            parentSignal.removeEventListener('abort', cancel);
            removeAbortListener();
            controller.abort(new NotAllowed(spaceTrim('TEAM consultation ended.')));
        }
    }

    /** Accounts for actual model work even when parsing or execution fails, without summing nested totals twice. */
    private async executeAgent(
        scope: CoderTeamScope,
        argumentsObject: { message: string; context?: string },
    ): Promise<string> {
        const usages: Usage[] = [];
        try {
            const result = await this.options.execute({
                scope,
                ...argumentsObject,
                reportUsage: (usage) => {
                    usages.push(usage);
                },
            });
            if (!usages.length) usages.push(result.usage || UNCERTAIN_USAGE);
            scope.signal.throwIfAborted();
            if (
                typeof result.answer !== 'string' ||
                !result.answer.trim() ||
                result.answer.length > MAX_ANSWER_LENGTH
            ) {
                throw new ParseError(
                    spaceTrim(`TEAM ${scope.agent.name} returned an empty, oversized or malformed answer.`),
                );
            }
            return result.answer;
        } finally {
            const usage = usages.length ? addUsage(...usages) : UNCERTAIN_USAGE;
            if (!this.isClosed) this.usages.push(usage);
            await this.emit('team_usage', scope.invocationId, scope.agent.name, usage);
        }
    }

    /** Emits attribution on every trace event without passing session internals to a remote Book. */
    private async emit(
        type: CoderTeamEvent['type'],
        invocationId: string,
        agent: string,
        data: unknown,
        callerInvocationId?: string,
    ): Promise<void> {
        if (this.isClosed) return;
        await this.options.onEvent?.({
            type,
            sessionId: this.sessionId,
            taskId: this.options.taskId,
            invocationId,
            callerInvocationId,
            agent,
            data,
        });
    }
}

// Note: [💞] Runtime contract types accompany their implementation.
