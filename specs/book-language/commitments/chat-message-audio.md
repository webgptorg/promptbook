# CHAT MESSAGE AUDIO

[Commitments](_index.md) · [CHAT MESSAGE](chat-message.md) · [Chats](../../cli/chats.md) · [Git persistence](../../cli/git-persistence.md)

**Document:** Chat.

`CHAT MESSAGE AUDIO <record>` binds recorded speech to one existing message as **another representation of the same utterance**. It is not an extra attachment, another message, a new speaker or an instruction. Text and its audio are presented together and enter agent context once; replaying or importing the audio cannot dispatch the message again. An independently uploaded recording remains an ordinary attachment unless explicitly identified as an equivalent utterance.

## Source record and association

The content is one JSON object. Required `path` is a nonempty project-root-relative path to the recorded asset, using `/` separators. Optional `status` is `complete` (default), `interrupted` or `incomplete`. Optional timing is a group of `call`, `startMs` and `endMs`: a nonempty technical call correlation and finite nonnegative millisecond offsets with `startMs <= endMs`. All three must appear together. The offsets locate the segment on that call's shared monotonic timeline, not a file-seek range or a wall-clock timestamp. Omitted timing is unknown, not proof that speakers did not overlap. Distinguish different calls within the owning chat; the call label is nonsecret correlation, not another Book/entity identity. JSON keys/strings are typed metadata, not embedded entity references or executable chat content.

Place one or more consecutive audio commitments immediately after their `CHAT MESSAGE` body. They bind to that exact preceding message, in order; another commitment closes the group. Never resolve ownership by speaker, a matching timestamp or proximity across an intervening event. Several messages can have the same author/time, and a message can have several audio segments. Delayed media finalization enriches the originating message's group without moving any message/event, attaching to the latest message or rewriting historical text.

```book
CHAT Discuss export
CHAT MEMBER @User
CHAT MEMBER @Chatter
CHAT MESSAGE @User 2026-11-04T18:00:00+01:00
Please keep the existing column order.
CHAT MESSAGE AUDIO {"path":"assets/chat-audio/export-call/user-1.webm","call":"export-call","startMs":0,"endMs":2400}
CHAT MESSAGE @Chatter 2026-11-04T18:00:02+01:00
I'll keep the current order and
CHAT MESSAGE AUDIO {"path":"assets/chat-audio/export-call/chatter-1.webm","call":"export-call","startMs":1900,"endMs":3100,"status":"interrupted"}
```

Use the common maximal-uppercase commitment boundary: `CHAT MESSAGE AUDIO` is one keyword, never a shorter `CHAT MESSAGE` with AUDIO as its sender. Literal examples remain literal. Missing owner, malformed JSON/timing or an unsafe path is a source diagnostic; preserve the source and message rather than guessing a binding. Audio metadata does not interpret references or active invitation prefixes as actions.

## Speech fidelity and durable assets

Preserve both the user's captured speech and the agent's actually played speech in separately finalized segments. Retain the provider's available transcript with its actual author; mark unavailable or uncertain transcription explicitly rather than fabricate words. `complete` describes the recorded segment, not task success or completion of the whole answer. `interrupted` retains the portion actually heard before a deliberate cutoff; `incomplete` identifies truncated/failed capture. Generated but unplayed agent speech must not appear as heard speech. If the playback boundary is unknown, retain that uncertainty instead of declaring a complete audible answer.

Store finalized playable segments through the shared project chat-asset pipeline, with relative Book bindings and ordinary scoped chat commits, **including the audio files by default**. These are primary conversation assets, independent of optional task traces/browser video or provider-side retention. Do not keep only a temporary provider URL or place the sole recording in ignored runtime storage. Respect explicit uncommitted workflows and user ignore rules; an ignored/missing asset is a visible persistence problem, never a silently successful complete archive or a reason to force-add unrelated files.

Save accepted text promptly while recording continues. A committed audio binding includes its finalized asset in the same batch, or references an asset already committed. Bound segment finalization/commit delay during long calls; do not rewrite one ever-growing recording on each update. Interrupted capture preserves finalized segments and any recoverable partial segment with honest status. Missing audio cannot lose saved text or replay accepted requests. Reconnect/finalization deduplicates the same media segment. Constrain reads/writes to owned project assets and reject traversal or symlink escapes. Use the ordinary chat-asset confidentiality/secret rules.

## Acceptance outcomes

Round-trip one message with several audio segments, repeated sender/timestamps, Unicode/spaces in paths and overlapping speakers. Parse the full multiword keyword and preserve literal examples without new messages/actions. Reject orphan bindings, invalid timing and escaping paths without losing text. Finalize an earlier message's audio after a later reply without changing ownership/order. Import/read/replay text plus audio once. Verify scoped default commits include finalized files and bindings, explicit no-commit/ignore behavior stays honest, and interruption/reconnect retains known heard speech without duplicate requests or fabricated missing audio.
