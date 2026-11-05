# Voice controls in terminal and desktop chat

[Voice behavior](voice-chats.md) · [Chat presentation](chat-ui.md) · [Harness availability](harness-voice.md) · [Interactive feature servers](interactive-feature-bridges.md)

## The chat is the controller

Expose a discoverable **Start voice chat** action in the existing chat, in the terminal dashboard, `ptbk chat` and the local desktop app. During the call expose **End voice chat**, microphone mute/unmute and output mute/unmute with the observed call state. Make shortcuts discoverable and keep them compatible with rich composition, paste and ordinary navigation. Retain the draft, thread selection, scroll and return location.

Show connecting, awaiting browser permission/activation, listening, speaking, muted, reconnecting, ending, ended and failed states from actual events, including the active speaker and selected tool where useful. Muting is not disconnecting or suspending provider billing. Normal text input and task cards remain available during the call. Incoming messages, captions and audio updates cannot submit text or steal focus.

Before starting, use common availability results. With no supported configured harness, explain which supported option to install/add and offer the shared Tools setup route. Distinguish login, version, entitlement and device problems with the correct next action. Do not send users through setup again merely because an unrelated registered harness lacks voice. Recheck after setup and permit a normal retry without losing the chat. Raw/noninteractive commands never launch an invisible browser call or wait for hidden permission input.

## Media presentation

The media surface contains a simple animated orb or agent visual reflecting actual listening/speaking/audio activity, visible microphone/recording/call state and available read-only live captions. Preserve actual agent identity and use observed audio signals. Support reduced motion with a quiet static fallback.

In the terminal, the dedicated browser page provides media and a minimal activation control for browser permissions or playback. Normal start/end/mute and transcript-presentation controls remain in the terminal. Keep the call usable with the media page in the background after setup. Closing it ends voice and the terminal reports the outcome.

In the Windows/macOS app, embed the same media presentation, call controls and captions in the current chat. Obtain microphone permission for that trusted active voice surface under the [desktop permission rules](desktop.md#installation-and-isolation). The user can keep typing in the chat while speaking. Closing the owning voice surface or window ends the call and releases media.

## One visible conversation

Show interim recognition as provisional; preserve final transcript messages in ordinary chat chronology with actual authors. Display **audio available**, interrupted or incomplete capture on the same message under [CHAT MESSAGE AUDIO](../book-language/commitments/chat-message-audio.md), distinct from supplemental attachment chips. Audio playback/replay is inspection and cannot resend the message. Human-facing spoken replies remain normal messages; only actual backend progress follows the usual Thinking collapse.

When microphone access or playback needs action, identify it in the controlling chat. The terminal points to the existing media page and restores interaction focus to the same chat where the platform permits. The desktop presents the permission or activation in place. Speech interruption remains responsive while task status/results update. End/failure restores the ordinary text-chat presentation and keeps any draft.

## Acceptance outcomes

Use start/end and both mute controls from dashboard chat, standalone chat and the desktop chat, including narrow terminals, composition, resize and preserved drafts. Verify actual states, speaker attribution, provisional/final captions, recording indication and reduced motion. Verify permission/activation guidance and confirm that closing the page or desktop voice view releases media without cancelling independent work. Replaying archived audio does not execute its transcript.
