# Local realtime voice in ordinary chats

[Chats](chats.md) · [Voice adapter capability](harness-voice.md) · [Presentation](voice-chat-ui.md) · [Interactive feature servers](interactive-feature-bridges.md) · [Message audio](../book-language/commitments/chat-message-audio.md)

## Scope and entry

Explicitly start realtime voice in the **existing Chat Book** from the terminal project dashboard, standalone `ptbk chat` or the local Windows/macOS app. New chats use the ordinary entry/agent selection first. Switching between typing and speech retains the same name, participants, instructions, messages, linked work and question state. No voice-only conversation store, replacement chat or implicit task is created.

The client, audio devices and project engine are on the same computer. A plain SSH session to a VPS does not carry the local microphone. Explain the limitation and keep text chat available. Remote App/relay media is a future integration.

Start only with a ready permitted [voice-capable registered harness](harness-voice.md). The initial support is native Codex/ChatGPT login, with other adapters returning explicit unsupported results. Verify real capability/account access and give setup guidance when no candidate works, rather than enabling voice merely because a Codex executable is present. No silent API billing fallback is allowed.

## Shared call operations and local media

Use one call controller for starting, attaching, muting, ending, reporting media state and maintaining the controlling client lease. The terminal presenter starts the call's [temporary local server](interactive-feature-bridges.md), independent of the project HTTP server and desktop app. The desktop presenter embeds the media surface in the chat and uses the same call operations without a temporary server. Each surface supplies microphone input, speaker output, visual state and captions. The selected harness adapter owns provider negotiation and authentication.

Authorize one media owner per call, scoped to its chat and media/status operations. Keep provider credentials in the native adapter and out of client scripts, URLs and persisted chat content. Opening, reloading or duplicating a viewer cannot create another paid call or another input owner. Microphone permission and any required audio-activation gesture belong to the trusted voice surface.

Observe liveness of the controlling client and media surface. Restore focus to the same terminal chat once browser setup permits. Denied/missing devices, autoplay blocking, unavailable browser, provider denial and media/transport failure produce actionable status in the controlling chat while retaining normal chat and drafts. Show Listening only when microphone input is actually delivered. Private session handles do not become Book IDs.

## Continuous conversation and task control

Support listening and speaking concurrently, natural pauses and the user speaking over an answer, while backend work continues. The initial requirement is a live conversation comparable in interaction to ChatGPT Voice, not alternating record/upload/play turns. Latency and Czech speech quality must be checked with a real microphone/provider rather than inferred from a text fixture.

Barge-in promptly stops spoken playback; the adapter reconciles the actually heard boundary. It does **not** itself cancel a task, revert files or undo a remote action. Interpret the added speech in context through the responsible agent and ordinary [task control](task-control.md): a correction may steer work, a cancellation may stop it, and a request to listen may only stop speaking. Keep Saved/Delivered/Applied and confirmed/pending cancellation truthful. Do not ask for repeated task authorization solely because the channel changed to voice.

Use normal agent/persona instructions, participants, delegation and substantive-work boundaries. A task's progress/result can reach the conversation without blocking further speech; the spoken agent must not report completion that the backend has not established. Preserve actual authors when another agent joins or asks a question. Voice is an explicit chat interaction during engine Pause, like text chat; task work and task-advancing continuations remain paused. Stop/force stop/panic remain authoritative.

## Transcript, recording and recovery

Persist accepted user utterances and actual spoken agent replies in the ordinary `.book`, with their real speaker, order and originating question/task/turn correlation. Stream interim captions without creating a permanent message per token. Finalize coherent utterance segments, retaining their identity across transcript revisions and reconnect. Do not treat every interim transcript fragment as an accepted request; later speech can complete/correct the same utterance. The single dispatch path follows [adapter rules](harness-voice.md#one-conversation-and-one-execution-path).

Automatically preserve **both user and agent audio** through [CHAT MESSAGE AUDIO](../book-language/commitments/chat-message-audio.md), using finalized project chat assets committed with their bindings by default. Retain actual spoken transcripts rather than substituting a longer backend answer or a spoken summary for each other. Written results can remain ordinary distinct backend messages with truthful provenance; do not label unspoken text as heard audio. Overlap timing and interrupted/incomplete segments remain explicit. Recording follows the ordinary chat-asset pipeline, independently of optional traces/video; a provider-hosted recording alone is insufficient.

Save text promptly; bound recording segment size/duration and Git batch delay throughout a long call. A file finalizes once instead of repeatedly committing a growing whole-call binary. On transport/device/disk/Git failure, preserve accepted text and completed assets, report the incomplete archive and reconcile pending persistence without re-running accepted work. If speech was captured but its transcript is unavailable, retain the available recording and an explicit transcription diagnostic rather than invent words or execute a guessed instruction. Provider-local storage/session identifiers cannot replace project persistence.

Ending the call or closing or losing its media surface or controlling client stops microphone capture, playback and the associated provider voice session. Release call-owned resources, including any temporary server, in bounded time. Preserve chat history and independent tasks/engine operation. Graceful end flushes finalized recordings and pending conversation batches. A crash recovers available partial data without silently reopening the microphone or paid call. Reload/reconnect may reattach only to a still-authorized live call, retaining accepted input/operation receipts and verifying media ownership. If a new call is needed, restore durable text/context and reconcile outstanding work before accepting fresh execution. Closing voice is distinct from closing its backing chat or cancelling tasks.

## Acceptance outcomes

Start from an existing terminal dashboard chat, standalone chat and the Windows/macOS app. Type, speak, interrupt and return to typing in the same Book. Verify one shared history, live two-way Czech speech, relevant task management, actual authors and continued independent work. In Pause, voice discussion works while task execution stays paused. Stop/panic ends capture and provider voice resources. Reject unsupported/SSH cases actionably without exposing remote audio or starting hidden work.

Run the terminal flow with the project HTTP dashboard/server absent and the desktop flow without a temporary feature server. Exercise microphone permission/autoplay/device denial, duplicate viewers, reload/closure, client failure, network/provider loss and explicit end with no orphan microphone, call or listener. Recover partial recordings, late finalization, disk/Git failure and a long call with bounded commits. Check default Git contains the actual user/agent audio and Book bindings, overlap/interruption is honest, and reconnect/transcript/media replay never duplicates messages, tasks or external effects.
