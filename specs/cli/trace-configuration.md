# Trace recording and Git settings

[Main specification](../_main.md) · [Project configuration](configuration.md) · [Task traces](traces.md) · [Computer Control](computer-control.md)

Initialization collects three explicit browser-trace project choices in its dedicated [Traces screen](initialization-ui.md) and saves them in `ptbk.json`. They control evidence, not whether tasks execute or whether ordinary result commits are created. Legacy boolean names are converted by the [first configuration migration](tools-migration.md).

| Setting | Meaning | Initial default |
| --- | --- | --- |
| `traces.isCommitted` | Include task traces in Git result commits rather than ignore the whole `traces/` tree. | `false` |
| `traces.isVideoIgnored` | Exclude legacy trace-video directories from Git when other traces are included; new recordings always stay private. | `true` |
| `traces.isVideoRecordingEnabled` | Opt in to local recordings of attributable browser activity. | `false` |
| `computer.isRecordingEnabled` | Opt in to bounded local desktop screenshots in ignored `.ptbk/` storage; excludes owner-view screenshots and never enables desktop video. | `false` |

The desktop screenshot setting is a separate explicit opt-in, not another required init question. Explain storage/privacy implications and preserve explicit values during resume/reinit. Noninteractive equivalents use the same precedence, false handling and temporary overrides. Saving these choices is a scoped authoring operation, not a reason to rerun tasks.

When `traces.isCommitted` is false, the entire root-level `traces/` tree is ignored. When true, eligible privacy-filtered technical evidence can be committed, while `traces/*/local/` remains unconditionally ignored. New browser videos are stored in `traces/<task-file-basename>/local/video/`, irrespective of `traces.isVideoIgnored`. That legacy preference still controls older `traces/*/video/` directories; preserve its explicit value without claiming it permits new recordings in Git.

Recording is independent of technical trace inclusion: optional new videos always stay local, and technical text traces continue regardless. `traces.isVideoRecordingEnabled: false` prevents new recording, not deletion of old footage or a change to its inclusion policy. A task not using a browser needs no video. With multiple browsers, attribute footage to the actually used tool/attempt and exclude unrelated sessions.

Apply matching root ignore rules and scoped staging, preserving unrelated `.gitignore` entries. Never force-add ignored evidence, blanket-ignore unrelated project videos, or classify intentionally ignored traces as dirty-state blockers. Ignore changes do not erase tracked files/history; any needed untracking is explicitly approved and index-only, preserving local evidence.

Keep `.ptbk/`, every isolated browser profile, `.env` and other secret stores ignored independently. Managed-global/personal/custom profiles remain outside versioned configuration even when shared across projects. Trace inclusion grants no permission to record secrets or commit sessions. Filter structured computer/browser input payloads, clipboard values, scripts, live tool-result contents and image/base64 data before storage, including diagnostics; store operation metadata and outcomes instead. Known-secret/token redaction is not a universal classifier of sensitive prose or screen content. Optional local visual recording can still contain ordinary private page/desktop content; its opt-in and ignored storage do not promise anonymization. Historical trace files and Git history are not rewritten by this change. Wallet secret entry, recovery words and encryption/unlock material are excluded from video, screenshots, text/tool observations and tracing; ignored `.ptbk/wallet/` and `.ptbk/encryption/` never become trace artifacts. An explicit ordinary `--no-commit` task workflow still creates no result commits even with `traces.isCommitted` true; these settings only determine eligible evidence when committing is enabled.

Structured raw [usage](usage.md) follows `traces.isCommitted` by default alongside other evidence, independently of video exclusion. Keep it as durable primary data; cached aggregates and separate historical price observations may remain ignored under `.ptbk/`. Changing views/prices never deletes raw usage or makes it part of a disposable cache.

Desktop screenshot retention, limits and control gates are defined in [Computer Control](computer-control.md). Turning recording off prevents new captures from being saved; it does not erase existing local evidence or grant capture while paused, disabled, stopped or protected. Native owner-view frames are never saved by the agent recorder.
