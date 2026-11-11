import type { LoginField, WalletActionView, WalletRecordView, WalletSubEngine } from '../../wallet/wallet.js';
import { api, type ContractResponse } from '../../vendor/app-platform.js';

/** The already validated input of one Wallet route. */
type Request = { readonly params: Readonly<Record<string, unknown>>; readonly body: unknown };

/** Write-only login input parsed by the platform's route schema. */
type SaveInput = { readonly origin: string; readonly username: string; readonly password: string; readonly label?: string; readonly fields?: readonly LoginField[]; readonly requestId?: string };

/** A contract problem without any credential or internal diagnostic. */
function problem(code: string): ContractResponse { return { kind: 'problem', problem: api.createProblem(code) }; }

/** A successful contract response. */
function ok(data: unknown): ContractResponse { return { kind: 'ok', data }; }

/** Maps only the Wallet's nonsecret record view; passwords and field values never enter the projection. */
function record(view: WalletRecordView, wallet: WalletSubEngine): Record<string, unknown> {
    return { id: view.id, label: view.account.slice(0, 200), origin: view.origin, username: wallet.recordUsername(view.id)?.slice(0, 320) || null,
        fields: (view.fields ?? []).map(field => ({ label: field.label, uncertain: field.uncertain ?? false })), updatedAt: view.updatedAt,
        lastUse: view.lastUsedAt && view.lastOutcome ? { at: view.lastUsedAt, outcome: view.lastOutcome } : null,
        verification: view.verification ? { ...view.verification, reason: view.verification.reason.slice(0, 500) } : null };
}

/** One pending action in the API's closed, bounded shape. */
function request(view: WalletActionView): Record<string, unknown> {
    return { id: view.id, origin: view.origin, account: view.account?.slice(0, 320) || null, problem: view.problem,
        fields: view.fields ?? [], recordId: view.login ?? null, reason: view.reason.slice(0, 1000),
        tasks: view.tasks.slice(0, 50).map(name => name.slice(0, 256)), agents: (view.agents ?? []).slice(0, 50).map(name => name.slice(0, 256)),
        requests: view.requests, createdAt: view.createdAt, seenAt: view.seenAt ?? null, step: view.step ?? 0 };
}

/**
 * The App's Wallet routes over the same encrypted store and request operations as the host clients. Authorization,
 * strict input parsing and step-up remain in EngineApi.dispatch before any handler can run.
 * @private App Wallet adapter
 */
export function walletHandlers(getWallet: () => WalletSubEngine): Readonly<Record<string, (input: Request) => Promise<ContractResponse>>> {
    const save = async ({ params, body }: Request): Promise<ContractResponse> => {
        const wallet = getWallet();
        if (wallet.readiness !== 'ready') return problem('wallet-not-ready');
        const input = body as SaveInput;
        const result = await wallet.save({ origin: input.origin, username: input.username, password: input.password,
            ...(input.label === undefined ? {} : { label: input.label }), ...(input.fields ? { fields: input.fields } : {}),
            ...(params.recordId ? { id: String(params.recordId) } : {}), ...(input.requestId ? { action: input.requestId } : {}) });
        const saved = wallet.view().records.find(candidate => candidate.id === result.id);
        return saved ? ok({ record: record(saved, wallet), resolvedRequestIds: (result.resolvedRequestIds ?? []).slice(0, 200) }) : problem('not-found');
    };
    const manage = async ({ params, body }: Request, reject: boolean): Promise<ContractResponse> => {
        const wallet = getWallet();
        const id = String(params.requestId);
        const step = (body as { step: number }).step;
        const before = wallet.view().pending.find(candidate => candidate.id === id);
        if (!before) return problem('not-found');
        if ((before.step ?? 0) !== step) return problem('wallet-request-moved');
        const result = reject ? await wallet.reject(id, step) : await wallet.markSeen(id, step);
        const after = wallet.view().pending.find(candidate => candidate.id === id);
        if (reject && result.applied) return ok(null);
        if (!after) return problem('not-found');
        if ((after.step ?? 0) !== step) return problem('wallet-request-moved');
        return reject ? problem('not-found') : ok(request(after));
    };
    return {
        getWallet: async () => {
            const wallet = getWallet();
            const view = wallet.view();
            return ok({ state: view.state, records: view.state === 'ready' ? view.records.slice(0, 1000).map(view => record(view, wallet)) : [],
                lockedRecords: view.lockedRecords ?? 0, pending: [...view.pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 200).map(request) });
        },
        addWalletRecord: save, updateWalletRecord: save,
        deleteWalletRecord: async ({ params }) => {
            const wallet = getWallet();
            if (wallet.readiness !== 'ready') return problem('wallet-not-ready');
            return (await wallet.remove(String(params.recordId))).applied ? ok(null) : problem('not-found');
        },
        markWalletRequestSeen: async input => await manage(input, false), rejectWalletRequest: async input => await manage(input, true),
    };
}
