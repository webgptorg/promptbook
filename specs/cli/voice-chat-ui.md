# Terminal control and the voice media window

[Voice behavior](voice-chats.md) · [Chat presentation](chat-ui.md) · [Harness availability](harness-voice.md)

## Terminal is the controller

Expose a discoverable **Start voice chat** action in the existing terminal chat, both inside the dashboard and through `ptbk chat`. During the call expose **End voice chat**, microphone mute/unmute and output mute/unmute with the observed call state. Shortcuts must coexist with rich composition, paste and ordinary navigation; show them rather than silently capture typed message text. Retain the draft, thread selection, scroll and return location.

Show connecting, awaiting browser permission/activation, listening, speaking, muted, reconnecting, ending, ended and failed states from actual events, including the active speaker and selected tool where useful. Muting is not disconnecting or suspending provider billing. Normal text input and task cards remain available during the call. Incoming messages, captions and audio updates cannot submit text or steal focus.

Before starting, use common availability results. With no supported configured harness, explain which supported option to install/add and offer the shared Tools setup route. Distinguish login, version, entitlement and device problems with the correct next action. Do not send users through setup again merely because an unrelated registered harness lacks voice. Recheck after setup and permit a normal retry without losing the chat. Raw/noninteractive commands never launch an invisible browser call or wait for hidden permission input.

## Minimal media page

The dedicated ad hoc browser page contains a simple animated orb/agent visual reflecting actual listening/speaking/audio activity, a visible microphone/recording/call-state indication and available read-only live captions. Preserve actual agent identity rather than imply every participant is an anonymous assistant. Use available signal/state, not fabricated thinking progress. Handle reduced motion and a quiet static fallback.

This page is a technical audio surface, **not a project dashboard or another chat editor**. Normal start/end/mute and transcript-presentation choices remain in the terminal. Browser permission prompts and a minimal activation affordance when playback policies require a gesture are the technical exception. Do not add project navigation, task/tool controls, account setup forms or an independent message composer. Keep the call usable with the media page in the background after setup; closing it ends voice and the terminal reports that outcome.

## One visible conversation

Show interim recognition as provisional; preserve final transcript messages in ordinary chat chronology with actual authors. Display **audio available**, interrupted or incomplete capture on the same message under [CHAT MESSAGE AUDIO](../book-language/commitments/chat-message-audio.md), distinct from supplemental attachment chips. Audio playback/replay is inspection and cannot resend the message. Human-facing spoken replies remain normal messages; only actual backend progress follows the usual Thinking collapse.

When microphone access or playback needs browser action, identify it clearly in the terminal and direct the user to the existing media page. After technical setup, return interaction focus to the same chat where the platform permits. Speech interruption must remain responsive even while the terminal is displaying a task status/result. End/failure restores the ordinary text-chat presentation and keeps any draft.

## Acceptance outcomes

Use start/end and both mute controls from dashboard chat and standalone chat, including narrow terminals, composition, resize and preserved drafts. Verify actual states, speaker attribution, provisional/final captions, recording indication and reduced motion. Confirm the media page has no general project controls/composer, technical permission/activation guidance is usable, and page closure or terminal loss is reflected without cancelling independent work. Replaying archived audio does not execute its transcript.
