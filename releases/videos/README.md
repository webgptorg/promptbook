# Release videos

The editable [Release Video agent](../../agents/release-video.book) owns this responsibility. The owner's [original conversation](../../chats/2026-11-01-0224-chatter-after-each-version-publish-a-video-on-my.book) authorizes public videos after every release, starting at **0.119.0-45**. Do not treat the author's account details as evidence of a particular YouTube channel.

[Release discovery](../../tasks/2026-11-01-release-video-watch.book) uses the engine's ordinary hourly recurrence, starting at 04:00 Europe/Prague on 2026-11-01. This is polling for published releases, not an instantaneous release webhook. It checks all missing versions after downtime. Each newly published version gets one ordinary publication task; no upload happens simply because package.json changed. The initial version remains owned by [the initial task](../../tasks/2026-11-01-0225-create-a-release-video-agent-and-publish-youtube.book).

For every exact version, keep a directory containing:

- `script.md`: title, description, narration, evidence tied to the release revision and demonstrated behavior.
- Reproducible demo commands/output and render sources, with captions and any synthetic narration disclosed. Generated media stays locally ignored; preserve the sources needed to regenerate it.
- `status.md`: actual preparation/upload/processing/publication state. After publication include channel ID, video ID, canonical URL, public visibility, timestamp and the external-action receipt. Never substitute preparation for publication evidence.

Before any upload, claim the version files, inspect existing tasks and action records, and search the verified personal channel's Studio content (draft/private/unlisted included). Reconcile uncertain outcomes using the same action ID; recover an existing upload rather than creating another. A confirmed published video permanently closes that version's upload work. A local status file alone is not a remote acknowledgement. Do not delete an existing video merely to retry.

Verify the exact version from `https://registry.npmjs.org/ptbk/<version>` and compare its `gitHead` with the matching tag. Use the preceding **published** version as the change baseline. Source material from the immutable release tree, not later HEAD or the entire accumulated unreleased changelog. Demonstrate only release code in safe fixtures. Record limitations and omitted claims.

The target is the owner's existing personal channel. Record its stable ID once verified; never create a substitute channel. The currently available workspace account has no channel (see initial version status). Use the protected Wallet flow if a personal-account sign-in is needed. Keep credentials out of all artifacts. Read-only research does not need external-action records; remote mutations do.
