import type { StateStore } from './state.js';

/**
 * Contextual operations on existing work. Status queries and completion notifications are not here: they leave the task
 * untouched.
 *
 * @private task control
 */
export type TaskControlOperation = 'amend' | 'accept' | 'cancel' | 'retire' | 'reopen';

/**
 * Who a control request verifiably comes from: a real user message or an operator's own client. An agent's proposal is
 * advice and never changes work by itself, whatever it quotes.
 *
 * @private task control
 */
export type TaskControlOrigin = {
    /** Trust of the request, decided by the engine from where it arrived. */
    readonly authority: 'user' | 'operator' | 'agent';
    /** Source chat, when it came through one. */
    readonly chat?: string;
    /** The original accepted user message, verbatim. */
    readonly message?: string;
    /** Position of that message in its chat. */
    readonly messageIndex?: number;
    /** The client it came through. */
    readonly via: string;
    /** The agent that carried it, when one did. */
    readonly by?: string;
};

/**
 * Durable record of one accepted control request, separate from the Book's instruction history.
 *
 * @private task control
 */
export type TaskControlRecord = {
    /** Identity of this request. */
    readonly id: string;
    /** What was asked. */
    readonly operation: TaskControlOperation;
    /** Task name when it was accepted. */
    readonly task: string;
    /** Task source. */
    readonly source: string;
    /** Scope written to the Book. */
    readonly scope: string;
    /** Identity of the amendment in the Book. */
    readonly change?: string;
    /** The interpreted instruction. */
    readonly instruction: string;
    /** Where it came from. */
    readonly origin: TaskControlOrigin;
    /** Responsible agent when it was accepted. */
    readonly agent?: string;
    /** Harness sessions it affected when it was accepted. */
    readonly sessions: readonly string[];
    /** When it was accepted. */
    readonly at: string;
};

/**
 * Outcome of one amendment for one session. Saved, Delivered and Applied are distinct evidence; the others say why
 * delivery has not happened.
 *
 * @private task control
 */
export type InstructionReceiptState = 'saved' | 'queued' | 'deferred' | 'delivered' | 'applied' | 'rejected' | 'failed' | 'uncertain';

/**
 * Per-change, per-session delivery evidence.
 *
 * @private task control
 */
export type InstructionReceipt = {
    /** Identity of the amendment in the Book. */
    readonly change: string;
    /** Task name. */
    readonly task: string;
    /** Task source. */
    readonly source: string;
    /** Source position of the amendment (its order). */
    readonly order: number;
    /** Target session handle (absent: no session has received it yet). */
    readonly session?: string;
    /** Current evidence. */
    readonly state: InstructionReceiptState;
    /** Why it is in that state. */
    readonly reason?: string;
    /** What happens next. */
    readonly next?: string;
    /** Latest change of state. */
    readonly at: string;
    /** Every earlier state with its time. */
    readonly history: ReadonlyArray<{ readonly state: InstructionReceiptState; readonly at: string }>;
};

/**
 * A persisted request to be told when work ends; nothing stays open while it waits.
 *
 * @private task control
 */
export type TaskNotification = {
    /** Identity. */
    readonly id: string;
    /** Task name. */
    readonly task: string;
    /** Task source. */
    readonly source: string;
    /** Chat to tell. */
    readonly chat: string;
    /** The agent that says it. */
    readonly by: string;
    /** Completed work cycles when it was requested: a later completion is what it waits for. */
    readonly cycle: number;
    /** When it was requested. */
    readonly at: string;
    /** When its one delivery happened. */
    readonly deliveredAt?: string;
    /** What was reported. */
    readonly outcome?: string;
};

/**
 * What clients show of task control.
 *
 * @private task control
 */
export type TaskControlView = {
    /** Receipts not yet Applied, oldest first, and the latest settled ones. */
    readonly receipts: readonly InstructionReceipt[];
    /** Notifications still waiting. */
    readonly notifications: readonly TaskNotification[];
};

/**
 * One piece of work as a status query reports it.
 *
 * @private task control
 */
export type TaskStatusView = {
    /** Task name. */
    readonly task: string;
    /** Actual readiness. */
    readonly state: string;
    /** Why it is in that state. */
    readonly reason?: string;
    /** Responsible agent. */
    readonly agent?: string;
    /** Its open harness sessions in plain words. */
    readonly sessions: readonly string[];
    /** Outstanding instruction receipts in plain words. */
    readonly receipts: readonly string[];
    /** The latest result summary. */
    readonly result?: string;
};

/**
 * What accepting a change actually achieved.
 *
 * @private task control
 */
export type TaskControlOutcome = {
    /** Task name. */
    readonly task: string;
    /** What was asked. */
    readonly operation: TaskControlOperation;
    /** Scope written to the Book. */
    readonly scope: string;
    /** Identity of the amendment. */
    readonly change: string;
    /** Whether it also reopened finished work. */
    readonly reopened: boolean;
    /** Whether Git has it yet (the Book has it either way). */
    readonly persistence: 'committed' | 'pending';
    /** The plain statement of delivery; intent is never proof of a stop. */
    readonly delivery: string;
};

/**
 * Persisted form.
 */
type TaskControlState = {
    readonly controls: readonly TaskControlRecord[];
    readonly receipts: readonly InstructionReceipt[];
    readonly notifications: readonly TaskNotification[];
};

/**
 * Settled entries kept for inspection.
 */
const RETAINED = 200;

/**
 * Whether a receipt still needs something to happen.
 *
 * @private task control
 */
export function isOutstandingReceipt(receipt: Pick<InstructionReceipt, 'state'>): boolean {
    return receipt.state !== 'applied' && receipt.state !== 'rejected';
}

/**
 * Plain words of one receipt, shared by every client.
 *
 * @private task control
 */
export function receiptLine(receipt: InstructionReceipt): string {
    const label = { saved: 'Saved', queued: 'Queued', deferred: 'Deferred', delivered: 'Delivered', applied: 'Applied', rejected: 'Rejected', failed: 'Failed', uncertain: 'Uncertain' }[receipt.state];
    return `${label}: change of {${receipt.task}}${receipt.reason ? ` - ${receipt.reason}` : ''}${receipt.next ? ` Next: ${receipt.next}` : ''}`;
}

/**
 * The durable store of control requests, per-session receipts and notifications. Restart reconciles it without replaying
 * anything: the Book stays the source of the instructions, and acknowledgement lost with a process stays uncertain.
 *
 * @private task control
 */
export class TaskControlStore {
    private state: TaskControlState = { controls: [], receipts: [], notifications: [] };

    public constructor(private readonly store: StateStore) {}

    /** Loads the store; delivery in flight when the engine stopped has no evidence of processing. */
    public async load(): Promise<void> {
        const stored = (await this.store.readTaskControl()) as TaskControlState | undefined;
        if (!stored) return;
        const at = new Date().toISOString();
        this.state = {
            ...stored,
            receipts: stored.receipts.map((receipt) => {
                if (receipt.state === 'delivered') return this.transition(receipt, 'uncertain', 'The engine stopped before its processing was observed.', 'It is not sent again as a new instruction; the next turn works from the current Book.', at);
                if (receipt.state === 'queued') return this.transition(receipt, 'deferred', 'The engine stopped before it was delivered.', 'The next turn of this work receives it.', at);
                return receipt;
            }),
        };
        await this.save();
    }

    /** Records an accepted request. */
    public async recordControl(control: TaskControlRecord): Promise<void> {
        this.state = { ...this.state, controls: [...this.state.controls, control].slice(-RETAINED) };
        await this.save();
    }

    /** Creates or moves the receipt of one change for one session. */
    public async mark(change: { readonly change: string; readonly task: string; readonly source: string; readonly order: number }, session: string | undefined, state: InstructionReceiptState, reason?: string, next?: string): Promise<void> {
        const at = new Date().toISOString();
        const index = this.state.receipts.findIndex((receipt) => receipt.change === change.change && receipt.source === change.source && (receipt.session === session || receipt.session === undefined));
        const receipts = [...this.state.receipts];
        if (index >= 0) receipts[index] = { ...this.transition(receipts[index]!, state, reason, next, at), ...(session ? { session } : {}) };
        else receipts.push({ ...change, ...(session ? { session } : {}), state, ...(reason ? { reason } : {}), ...(next ? { next } : {}), at, history: [] });
        this.state = { ...this.state, receipts: this.prune(receipts) };
        await this.save();
    }

    /** Moves every outstanding receipt of the given changes of a task, when the given state is new evidence. */
    public async advance(source: string, changes: readonly string[], session: string | undefined, state: Extract<InstructionReceiptState, 'delivered' | 'applied' | 'uncertain'>, reason: string): Promise<void> {
        const at = new Date().toISOString();
        const known = new Set(changes);
        let moved = false;
        const receipts = this.state.receipts.map((receipt) => {
            if (receipt.source !== source || !known.has(receipt.change) || !isOutstandingReceipt(receipt) || (receipt.session && session && receipt.session !== session)) return receipt;
            if (state === 'delivered' && receipt.state === 'delivered') return receipt;
            moved = true;
            return { ...this.transition(receipt, state, reason, undefined, at), ...(session ? { session } : {}) };
        });
        if (!moved) return;
        this.state = { ...this.state, receipts: this.prune(receipts) };
        await this.save();
    }

    /** Settles every outstanding receipt of a task whose run ended, with what is actually known. */
    public async settleSource(source: string, state: InstructionReceiptState, reason: string): Promise<void> {
        const at = new Date().toISOString();
        const receipts = this.state.receipts.map((receipt) => (receipt.source === source && isOutstandingReceipt(receipt) ? this.transition(receipt, state, reason, undefined, at) : receipt));
        this.state = { ...this.state, receipts: this.prune(receipts) };
        await this.save();
    }

    /** Persists a completion notification, unless the same chat already waits for it. */
    public async subscribe(notification: TaskNotification): Promise<TaskNotification> {
        const existing = this.state.notifications.find((candidate) => !candidate.deliveredAt && candidate.source === notification.source && candidate.chat === notification.chat);
        if (existing) return existing;
        this.state = { ...this.state, notifications: [...this.state.notifications, notification] };
        await this.save();
        return notification;
    }

    /** Notifications not delivered yet. */
    public waiting(): readonly TaskNotification[] {
        return this.state.notifications.filter((notification) => !notification.deliveredAt);
    }

    /** Records the one delivery of a notification. */
    public async delivered(id: string, outcome: string): Promise<void> {
        const at = new Date().toISOString();
        const notifications = this.state.notifications.map((notification) => (notification.id === id ? { ...notification, deliveredAt: at, outcome } : notification));
        const settled = notifications.filter((notification) => notification.deliveredAt).slice(-RETAINED);
        this.state = { ...this.state, notifications: [...settled, ...notifications.filter((notification) => !notification.deliveredAt)] };
        await this.save();
    }

    /** Receipts of one task, in source order. */
    public receiptsOf(source: string): readonly InstructionReceipt[] {
        return this.state.receipts.filter((receipt) => receipt.source === source).sort((first, second) => first.order - second.order);
    }

    /** What clients show. */
    public view(): TaskControlView {
        const receipts = [...this.state.receipts];
        return { receipts: [...receipts.filter(isOutstandingReceipt), ...receipts.filter((receipt) => !isOutstandingReceipt(receipt)).slice(-20)], notifications: this.waiting() };
    }

    private transition(receipt: InstructionReceipt, state: InstructionReceiptState, reason: string | undefined, next: string | undefined, at: string): InstructionReceipt {
        return { ...receipt, state, reason, next, at, history: [...receipt.history, { state: receipt.state, at: receipt.at }] };
    }

    private prune(receipts: readonly InstructionReceipt[]): InstructionReceipt[] {
        const settled = receipts.filter((receipt) => !isOutstandingReceipt(receipt));
        const excess = new Set(settled.slice(0, Math.max(0, settled.length - RETAINED)));
        return receipts.filter((receipt) => !excess.has(receipt));
    }

    private async save(): Promise<void> {
        await this.store.writeTaskControl(this.state);
    }
}
