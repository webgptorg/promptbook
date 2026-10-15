# Trace recording and Git settings

[Main specification](../_main.md) · [Project configuration](configuration.md) · [Task traces](traces.md)

Initialization collects three explicit project choices in its dedicated [Traces screen](initialization-ui.md) and saves them in `ptbk.json`. These settings control evidence, not whether tasks execute or whether ordinary result commits are created.

| Setting | Meaning | Initial default |
| --- | --- | --- |
| `traces.commit` | Include task traces in Git result commits rather than ignore the whole `traces/` tree. | `false` |
| `traces.ignoreVideos` | Exclude trace videos from Git even when other traces are included. | `true` |
| `traces.recordVideo` | Record browser activity for tasks that use the project browser. | `true` |

Explain each choice before confirmation, including the sensitivity and size of browser recordings. Preserve existing values during resume/reinit. Noninteractive init accepts equivalent settings in advance; normal configuration precedence, explicit false handling and temporary-override semantics apply. Saving choices is a scoped configuration/authoring operation, not a reason to rerun existing tasks.

## Effective behavior

When `traces.commit` is false, the entire root-level `traces/` tree is ignored, including videos, regardless of `traces.ignoreVideos`. When true, include non-video evidence; include video only when `traces.ignoreVideos` is false. Show this dependency rather than suggesting that an excluded parent directory can still version its videos. Preserve the stored video preference when the parent choice changes.

`traces.recordVideo` is independent of Git inclusion: videos can be recorded locally but excluded from commits, and text traces continue regardless. False prevents new recording; it neither deletes earlier footage nor changes how existing eligible artifacts are versioned. A task that never uses the browser needs no video.

Apply matching project-root ignore rules and scoped staging behavior, preserving unrelated `.gitignore` entries. Do not force-add ignored traces, blanket-ignore unrelated videos elsewhere in the project, or treat intentionally ignored evidence as a dirty-workspace blocker. Changing ignore rules does not erase already tracked files or Git history; any needed untracking is an explicitly approved index-only change that preserves local evidence. Never rewrite history or delete recordings just to apply a preference.

Keep runtime state and browser profiles under `.ptbk/` ignored independently of all three choices. Trace inclusion does not authorize recording secrets, committing sessions or bypassing [Git ownership](git-persistence.md). Explicit `--no-commit` still creates no commits, even with `traces.commit` enabled; the policy determines eligible evidence when committing is enabled.
