# Trace recording and Git settings

[Main specification](../_main.md) · [Project configuration](configuration.md) · [Task traces](traces.md)

Initialization collects three explicit project choices in its dedicated [Traces screen](initialization-ui.md) and saves them in `ptbk.json`. They control evidence, not whether tasks execute or whether ordinary result commits are created. Legacy boolean names are converted by the [first configuration migration](tools-migration.md).

| Setting | Meaning | Initial default |
| --- | --- | --- |
| `traces.isCommitted` | Include task traces in Git result commits rather than ignore the whole `traces/` tree. | `false` |
| `traces.isVideoIgnored` | Exclude trace videos from Git even when other traces are included. | `true` |
| `traces.isVideoRecordingEnabled` | Record attributable activity of browser tools used by tasks. | `true` |

Explain storage/privacy implications and preserve explicit values during resume/reinit. Noninteractive equivalents use the same precedence, false handling and temporary overrides. Saving these choices is a scoped authoring operation, not a reason to rerun tasks.

When `traces.isCommitted` is false, the entire root-level `traces/` tree, including video, is ignored regardless of the video preference. When true, include non-video evidence and include video only when `traces.isVideoIgnored` is false. Show effective parent/video exclusion and retain the stored preference when its parent choice changes.

Recording is independent of Git inclusion: local videos may be excluded from commits, and text traces continue regardless. `traces.isVideoRecordingEnabled: false` prevents new recording, not deletion of old footage or a change to its inclusion policy. A task not using a browser needs no video. With multiple browsers, attribute footage to the actually used tool/attempt and exclude unrelated sessions.

Apply matching root ignore rules and scoped staging, preserving unrelated `.gitignore` entries. Never force-add ignored evidence, blanket-ignore unrelated project videos, or classify intentionally ignored traces as dirty-state blockers. Ignore changes do not erase tracked files/history; any needed untracking is explicitly approved and index-only, preserving local evidence.

Keep `.ptbk/`, every isolated browser profile, `.env` and other secret stores ignored independently. Managed-global/personal/custom profiles remain outside versioned configuration even when shared across projects. Trace inclusion grants no permission to record secrets or commit sessions. Wallet secret entry, recovery words and encryption/unlock material are excluded from video, screenshots, text/tool observations and tracing; ignored `.ptbk/wallet/` and `.ptbk/encryption/` never become trace artifacts. An explicit ordinary `--no-commit` task workflow still creates no result commits even with `traces.isCommitted` true; these settings only determine eligible evidence when committing is enabled.
