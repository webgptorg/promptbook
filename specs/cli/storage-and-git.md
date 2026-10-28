# Storage and Git audit trail

[Main specification](../_main.md) · [Workspace](workspace.md) · [Git persistence](git-persistence.md)

This is the entry point for deciding where project information belongs and what is committed. Preserve primary data now so later dashboards, exports and analyses can be rebuilt without reconstructing lost history. Files are saved immediately; a Git commit represents one understandable logical piece of work.

| Information | Storage and lifetime | Git policy |
| --- | --- | --- |
| Agent, task and chat Books; specifications; nonsecret saved configuration | Readable project sources, retaining chronology where required by [Book layering](../book-language/layering.md). | Scoped logical commits under [Git persistence](git-persistence.md). |
| Available harness output, events, browser evidence and structured raw usage | Attributed durable evidence under root `traces/`; task directories use the literal source basename. | [Trace policy](trace-configuration.md); usage follows traces by default. |
| Wallet credentials, TOTP generators, encryption/recovery metadata | Persistent encrypted ignored `.ptbk/wallet/` and `.ptbk/encryption/`. | Never commit secret values, ciphertext vault files or recovery material. Only the nonsecret operation audit below is eligible. |
| Historical price-list observations | Ignored `.ptbk/pricing/`, separate from usage records. | Not required to be committed; retain snapshots independently. |
| Rebuildable totals, indexes and UI preferences | Ignored internal cache/presentation state under `.ptbk/`. | Do not commit derived caches or navigation. |
| Locks, live ownership, pending recovery and sessions | Local runtime storage; some of it is persistent and must survive cleanup. | Ignored; never assume all of `.ptbk/` is disposable. |
| Known-project registry and host discovery | OS-user-scoped private host metadata under the [home/identity policy](workspace.md#home-directory-and-shared-projects-root). | Outside project history; not another engine or work queue. |

Private/personal agendas normally use a private remote or a local-only repository. Git backing does not imply public publication or a requirement to configure a remote. Preserve explicit repository choices and existing history.

## Logical operations

Group compatible chat/authoring changes intelligently, while saving each accepted message and file immediately. Keep unrelated tasks and unfinished work out of each other's commits, including same-file interleaving. A detailed commit body can explain the work, decisions, external outcome and named task/chat provenance; the subject follows one common [format](git-persistence.md#commit-messages-and-history).

A real operation can be meaningful without changing a versioned file. Permit an intentionally empty audit commit for completed external work or a Wallet mutation when there is no eligible file change. Identify the actual operation and nonsecret outcome in its subject/body. Do not manufacture empty commits for inspection, unchanged init, routine polling, navigation or no-ops. Git records an external action; reverting that record does not undo or authorize replay of the action.

## Wallet operation audit

`wallet.isAuditCommitted` defaults to `true` and can be disabled without disabling Wallet. A successful meaningful add, update, removal or generator import has its own scoped audit commit, empty if needed. Respect an explicitly uncommitted workflow. Audit neither bundles unrelated work nor commits the vault.

Identify the operation and the item's editable nonsecret label, initially derived from service and account. Keep secrets, TOTP seeds/codes, passwords, keys, recovery words and secret-containing URLs/payloads out of both subject and body. Unchanged records, login attempts and repeated retries do not create mutation commits. Preserve the successful mutation when Git fails and report/retry pending audit persistence without repeating the operation.

## Acceptance outcomes

Recover saved messages and raw evidence before a pending Git batch. Inspect representative file-changing, external-only and Wallet-only operations: each logical operation has the correct scoped audit, no unrelated edits and no secrets. Disable Wallet auditing and verify storage/login still work. Rebuild usage aggregates from raw data and historical prices without using a cached dashboard total. Private/local-only projects require no publication.
