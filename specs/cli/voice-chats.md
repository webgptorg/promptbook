# Local realtime voice in ordinary chats

[Chats](chats.md) · [Voice adapter capability](harness-voice.md) · [Presentation](voice-chat-ui.md) · [Message audio](../book-language/commitments/chat-message-audio.md)

## Scope and entry

From a terminal project dashboard's chat or the same standalone `ptbk chat` interface, explicitly start a full realtime voice conversation in that **existing Chat Book**. New chats use the ordinary entry/agent selection first. Switching between typing and speech retains the same name, participants, instructions, messages, linked work and question state. No voice-only conversation store, replacement chat or implicit task is created.

This initial mode is local: the terminal client, microphone/audio browser and project engine run on the same computer. A plain SSH session to a VPS does not carry the local microphone and cannot start this mode as though server audio were local. Explain the limitation and keep text chat available. Remote App/relay media and desktop-client voice are separate future integrations; this feature is usable without either.

Start only with a ready permitted [voice-capable registered harness](harness-voice.md). The initial support is native Codex/ChatGPT login, with other adapters returning explicit unsupported results. Verify real capability/account access and give setup guidance when no candidate works, rather than enabling voice merely because a Codex executable is present. No silent API billing fallback is allowed.

## Call-owned browser audio bridge

Create a small ad hoc loopback audio bridge and open its dedicated browser page only for this call. It serves/negotiates microphone input, speaker output, visual state and transcript events. The terminal remains the controller. **Do not reuse or depend on the project web dashboard, its HTTP server/API, the browser SPA or a desktop control app.** Their replacement/removal does not remove this feature; no always-running audio server or user-managed port/service is introduced. Provider communication stays inside the selected harness adapter.

Bind locally, authenticate the page to its specific call with short-lived private access, verify its origin and confine it to that chat's media/status operations. It is not a generic project-control endpoint. Keep provider credentials in the native adapter, not browser scripts, URLs or persisted chat content. Opening/reloading/duplicating the page cannot create another paid call or another input owner. Browser microphone permission and any required audio-activation gesture are explicit technical setup, not an alternative web control dashboard.

The terminal owns an observed call lease. Starting, muting/unmuting microphone or output, and ending the call act through shared operations with accurate state. Restore focus to the same terminal chat once browser setup permits. Denied/missing devices, autoplay blocking, unavailable browser, provider denial and media/bridge failure produce actionable terminal status while retaining normal chat and drafts. Never claim Listening when the microphone is not being delivered. Private bridge identifiers are technical handles, not new Book IDs.

## Continuous conversation and task control

Support listening and speaking concurrently, natural pauses and the user speaking over an answer, while backend work continues. The initial requirement is a live conversation comparable in interaction to ChatGPT Voice, not alternating record/upload/play turns. Latency and Czech speech quality must be checked with a real microphone/provider rather than inferred from a text fixture.

Barge-in promptly stops spoken playback; the adapter reconciles the actually heard boundary. It does **not** itself cancel a task, revert files or undo a remote action. Interpret the added speech in context through the responsible agent and ordinary [task control](task-control.md): a correction may steer work, a cancellation may stop it, and a request to listen may only stop speaking. Keep Saved/Delivered/Applied and confirmed/pending cancellation truthful. Do not ask for repeated task authorization solely because the channel changed to voice.

Use normal agent/persona instructions, participants, delegation and substantive-work boundaries. A task's progress/result can reach the conversation without blocking further speech; the spoken agent must not report completion that the backend has not established. Preserve actual authors when another agent joins or asks a question. Voice is an explicit chat interaction during engine Pause, like text chat; task work and task-advancing continuations remain paused. Stop/force stop/panic remain authoritative.

## Transcript, recording and recovery

Persist accepted user utterances and actual spoken agent replies in the ordinary `.book`, with their real speaker, order and originating question/task/turn correlation. Stream interim captions without creating a permanent message per token. Finalize coherent utterance segments, retaining their identity across transcript revisions and reconnect. Do not treat every interim transcript fragment as an accepted request; later speech can complete/correct the same utterance. The single dispatch path follows [adapter rules](harness-voice.md#one-conversation-and-one-execution-path).

Automatically preserve **both user and agent audio** through [CHAT MESSAGE AUDIO](../book-language/commitments/chat-message-audio.md), using finalized project chat assets committed with their bindings by default. Retain actual spoken transcripts rather than substituting a longer backend answer or a spoken summary for each other. Written results can remain ordinary distinct backend messages with truthful provenance; do not label unspoken text as heard audio. Overlap timing and interrupted/incomplete segments remain explicit. Recording follows the ordinary chat-asset pipeline, independently of optional traces/video; a provider-hosted recording alone is insufficient.

Save text promptly; bound recording segment size/duration and Git batch delay throughout a long call. A file finalizes once instead of repeatedly committing a growing whole-call binary. On transport/device/disk/Git failure, preserve accepted text and completed assets, report the incomplete archive and reconcile pending persistence without re-running accepted work. If speech was captured but its transcript is unavailable, retain the available recording and an explicit transcription diagnostic rather than invent words or execute a guessed instruction. Provider-local storage/session identifiers cannot replace project persistence.

Ending the call, closing its media page or losing/closing its controlling terminal stops microphone capture, playback and the associated provider voice session and releases the call-owned bridge/resources in bounded time. It preserves chat history and independent tasks/engine operation. Graceful end flushes finalized recordings and pending conversation batches; a crash recovers available partial data honestly without silently reopening the microphone or paid call. Reload/reconnect may reattach only to a still-authorized live call, retaining accepted input/operation receipts and verifying media ownership. If a new call is needed, restore durable text/context and reconcile outstanding work before accepting fresh execution. Closing voice is distinct from closing its backing chat or cancelling tasks.

## Acceptance outcomes

Start from an existing terminal dashboard chat and standalone chat; type, speak, interrupt and return to typing in the same Book. Verify one shared history, live two-way Czech speech, relevant task management, actual authors and continued independent work. In Pause, voice discussion works while task execution stays paused; Stop/panic ends capture and provider voice resources. Reject unsupported/SSH cases actionably without exposing remote audio or starting hidden work.

Run with the old project HTTP dashboard/server absent. Exercise browser permission/autoplay/device denial, duplicate page, page reload/closure, terminal failure, network/provider loss and explicit end with no orphan microphone/call/bridge. Recover partial recordings, late finalization, disk/Git failure and a long call with bounded commits. Check default Git contains the actual user/agent audio and Book bindings, overlap/interruption is honest, and reconnect/transcript/media replay never duplicates messages, tasks or external effects.
