# Storage and Git audit trail

[Main specification](../_main.md) · [Workspace](workspace.md) · [Git persistence](git-persistence.md)

This is the entry point for deciding where project information belongs and what is committed. Preserve primary data now so later dashboards, exports and analyses can be rebuilt without reconstructing lost history. Files are saved immediately; a Git commit represents one understandable logical piece of work.

| Information | Storage and lifetime | Git policy |
| --- | --- | --- |
| Agent, task and chat Books; specifications; nonsecret saved configuration | Readable project sources, retaining chronology where required by [Book layering](../book-language/layering.md). | Scoped logical commits under [Git persistence](git-persistence.md). |
| Available harness output, events, browser evidence and structured raw usage | Attributed durable evidence under root `traces/`; task directories use the literal source basename. | [Trace policy](trace-configuration.md); usage follows traces by default. |
| Project brief/history | Root `report.book`, a Chat of appended Chatter messages. | Normal scoped commits independently of trace settings. |
| External actions | One readable Markdown record per remote mutation under root `actions/<task-file-basename>/`. | Versioned independently of trace settings and final task success; see [action log](action-log.md). |
| Wallet credentials/additional fields, retained legacy factor data, encryption/recovery metadata | Persistent encrypted ignored `.ptbk/wallet/` and `.ptbk/encryption/`. | Never commit secret values, ciphertext vault files or recovery material. Wallet operations create no Git commits. |
| Historical price-list observations | Ignored `.ptbk/pricing/`, separate from usage records. | Not required to be committed; retain snapshots independently. |
| Rebuildable totals, indexes and UI preferences | Ignored internal cache/presentation state under `.ptbk/`. | Do not commit derived caches or navigation. |
| Locks, live ownership, pending recovery and sessions | Local runtime storage; some of it is persistent and must survive cleanup. | Ignored; never assume all of `.ptbk/` is disposable. |
| Known-project registry and host discovery | OS-user-scoped private host metadata under the [home/identity policy](workspace.md#home-directory-and-shared-projects-root). | Outside project history; not another engine or work queue. |

Private/personal agendas normally use a private remote or a local-only repository. Git backing does not imply public publication or a requirement to configure a remote. Preserve explicit repository choices and existing history.

## Logical operations

Group compatible chat/authoring changes intelligently, while saving each accepted message and file immediately. Keep unrelated tasks and unfinished work out of each other's commits, including same-file interleaving. A detailed commit body can explain the work, decisions, external outcome and named task/chat provenance; the subject follows one common [format](git-persistence.md#commit-messages-and-history).

Every commit requires changes to eligible versioned files. Newly captured external task work must retain its [action record](action-log.md); commit that record as the operation's scoped change. Wallet operations persist only in protected ignored storage and create no Git commits. Git records an external action; reverting that record does not undo or authorize replay of the action.

## Acceptance outcomes

Recover saved messages and raw evidence before a pending Git batch. Inspect representative file-changing and external-only operations: each has its correct scoped file-changing commit, no unrelated edits and no secrets. Verify Wallet storage, import, login, recovery-word replacement and reset work without creating Git commits. Rebuild usage aggregates from raw data and historical prices without using a cached dashboard total. Private/local-only projects require no publication.
