# Realtime voice capability of harness adapters

[Harness adapters](harness-plugins.md) · [Sessions](harness-sessions.md) · [Voice chats](voice-chats.md) · [Native authentication](harness-authentication.md)

## One extensible capability

Realtime voice is an optional capability of the existing HARNESS plugin/session contract, not another entity, provider registry or task executor. Define the common operations and normalized results now for every adapter. The initial working integration is **OpenAI Codex with native ChatGPT account authentication**. Other adapters explicitly return `not implemented` through the same contract; a future implementation must not require redesigning the chat, audio bridge or tool-management UI. A separate ChatGPT Live harness/catalog entry is not required merely to expose Codex's voice capability.

Support means a continuous full-duplex spoken conversation, not merely text streaming, microphone transcription, audio-file input or text-to-speech. Declare actual supported input/output transcripts, interruption, media transport, speech/playback timing and capture limitations. Provider-specific protocols/model names stay in the adapter. The selected voice frontend and reasoning model may differ; preserve their actual identity and the chat agent's effective instructions/MODEL and normal work routing rather than silently substituting the voice model for its backend.

## Shared operations

| Operation | Required contract |
| --- | --- |
| Inspect voice availability | Return implementation support, observed installed version/transport/account context, ready/unavailable/unknown state, concrete reason and the applicable setup action. Ordinary inventory inspection does not open a paid call. |
| Start or attach the voice session | Use the selected registered tool, owning chat/agent/session context and scoped native authentication; negotiate the actual supported media transport and confirm readiness or a typed failure. |
| Exchange media and events | Carry negotiated microphone/output media and normalized listening/speaking/interruption/error/closure events, transcript deltas/final segments, timing and available usage. A transport can own media tracks; do not require pretending that every provider exposes identical raw-audio calls. |
| Supply context and backend outcomes | Seed the same chat's relevant history and effective role; deliver subsequent messages, actual task status/results and routing changes without duplicating turns or creating another authority path. |
| Interrupt spoken output | Stop actual playback promptly, report the supported cutoff and reconcile provider context with what was heard. This is distinct from interrupting/cancelling delegated work. |
| Reconcile or end | Reconnect/inspect only where supported, preserve accepted-message/operation correlation, and stop/release the voice session idempotently without closing unrelated harness sessions. |

The shared unsupported implementation returns a clear unsupported/not-implemented result for these operations, never silent success or a fake audio session. Runtime unavailability of an implemented adapter is a different result: missing executable, old version/transport, disabled tool, signed-out account, missing account entitlement, conflicting ownership, provider failure or unverified access. Temporary provider errors do not relabel the adapter as unimplemented. Microphone/speaker mute and device state belong to the shared local media bridge; reflect them truthfully even if the provider connection stays open.

## Discovery and native access

Discover **all enabled registered harness instances**, looking for at least one voice-capable candidate permitted for this chat. Do not hardcode a single display name or assume the first configured tool is suitable. Revalidate actual readiness when starting; successful text inference or `codex login status` is not proof of realtime entitlement. Explain chat-specific model/role/ownership incompatibility separately from a missing supported installation.

With no ready candidate, keep text chat usable and explain the applicable remedy. Offer enabling an existing compatible disabled instance where appropriate; missing support offers installation/configuration of a currently supported harness through shared tool management; missing authentication offers its native login; an old release offers an update. Entitlement/provider restrictions are reported as such, without reinstall loops. Refresh availability after setup/live tool changes. With several ready permitted instances, use the existing tool selection/fallback policy and retain actual account/session attribution; a live call cannot silently migrate to another account.

The first integration uses only the selected Codex/ChatGPT native account route that its actual installed version exposes and the account permits. An experimental upstream schema or availability in the ChatGPT desktop app is not proof that every Codex CLI/account can use it. Inspect supported native interfaces and handle rejection actionably; do not promise an unverified minimum version or universal availability. Never extract a ChatGPT token to impersonate a general API key, use private product endpoints independently of the native adapter, or fall back to separately billed OpenAI API access. API-key voice and additional harness implementations are future extensions, not part of this initial support.

## One conversation and one execution path

The adapter preserves each message's actual speaker and the ordinary chat's instructions, tool authority, questions, task links, persistence and session ownership. A voice frontend is the selected agent's presentation, not a new anonymous agent. Multi-agent speech/results remain attributed; changing the responding agent reuses normal participant/routing operations.

Distinguish transcript observation from backend dispatch. If the native voice integration already delivers an utterance to its backing session, saving that transcript must not run the ordinary text generator again. If the engine must dispatch it, do so once through the shared chat operation. Record which path accepted it; provider reconnection, transcript finalization, media playback and audio attachment cannot enqueue a second copy. Delegated substantial work still uses ordinary tasks. Honour [task control](task-control.md), engine lifecycle and any exclusive session lease rather than introduce a second uncontrolled writer.

Expose the finest actual voice-session usage/duration and backend usage separately under [Usage](usage.md); unavailable billing/metrics stay unknown. End-of-call usage reconciliation cannot double-count interim snapshots. Authentication, transport credentials and transient call endpoints stay out of Books, recordings metadata, logs and Git.

## Acceptance outcomes

Verify a real installed Codex/native account can negotiate the claimed voice path; unavailable accounts/versions fail with the correct remedy. Exercise a supported tool after an unsupported one, disabled/missing/signed-out instances, post-login refresh and multiple accounts without silent switching. Other adapters expose the shared unsupported result while text/task execution works. Test both native-consumed and engine-dispatched transcripts without duplicate turns, normal task tools/authority, interrupted speech versus continuing work, ownership conflicts, reconnect deduplication and final usage reconciliation. Provider availability and voice quality require real integration checks, not mocked text output alone.
