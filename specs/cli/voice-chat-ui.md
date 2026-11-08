# Voice controls in terminal and desktop chat

[Voice behavior](voice-chats.md) · [Chat presentation](chat-ui.md) · [Harness availability](harness-voice.md) · [Interactive feature servers](interactive-feature-bridges.md)

## The chat is the controller

Place **Start voice chat** alongside the regular composer in the open chat, both for an existing conversation and for a new chat after ordinary agent selection, even with zero messages. Use a visible button in the desktop composer and a discoverable in-chat action and shortcut in the terminal dashboard and standalone `ptbk chat`. Ordinary chat navigation is the sole way to choose the conversation. Voice entry and call controls belong exclusively to the chat view. Keep the project header, desktop feature bar and Chats list free of voice controls, voice-specific chat pickers and separate voice tabs.

Bind the start and all subsequent voice controls to the chat displayed when the action is invoked. Navigating to another chat never retargets a pending or active call. When navigation closes the owning view, apply the normal [call cleanup](voice-chats.md#transcript-recording-and-recovery). During the call expose **End voice chat**, microphone mute/unmute and output mute/unmute in the owning chat with the observed call state. Make shortcuts compatible with rich composition, paste and ordinary navigation. Retain the draft, thread selection, scroll and return location.

Show connecting, awaiting browser permission/activation, listening, speaking, muted, reconnecting, ending, ended and failed states from actual events, including the active speaker and selected tool where useful. Muting is not disconnecting or suspending provider billing. Keep the normal text composer, Send action and task cards available throughout the call. The user can submit a typed turn, then speak again without ending or restarting voice. Incoming messages, captions and audio updates cannot submit text or steal focus.

Before starting, use common availability results. With no supported configured harness, explain which supported option to install/add and offer the shared Tools setup route. Distinguish login, version, entitlement and device problems with the correct next action. Do not send users through setup again merely because an unrelated registered harness lacks voice. Recheck after setup and permit a normal retry without losing the chat. Raw/noninteractive commands never launch an invisible browser call or wait for hidden permission input.

## Media presentation

The media surface contains a simple animated orb or agent visual reflecting actual listening/speaking/audio activity, visible microphone/recording/call state and available read-only live captions. Preserve actual agent identity and use observed audio signals. Support reduced motion with a quiet static fallback.

In the terminal, the dedicated browser page provides media and a minimal activation control for browser permissions or playback. Normal start/end/mute and transcript-presentation controls remain in the terminal. Keep the call usable with the media page in the background after setup. Closing it ends voice and the terminal reports the outcome.

In the Windows/macOS app, embed the same media presentation and captions within the owning chat view alongside its call controls and composer. Obtain microphone permission for that trusted active voice surface under the [desktop permission rules](desktop.md#installation-and-isolation). Closing the owning voice surface or window ends the call and releases media.

## One visible conversation

Show interim recognition as provisional. Render accepted transcripts and typed messages together in ordinary chat chronology with their actual authors. Mark each spoken user or agent message with a visible **Voice** indicator, including while its recording finalizes. Use the existing [CHAT MESSAGE AUDIO](../book-language/commitments/chat-message-audio.md) binding as the durable indicator for recorded speech. Show the actual capture state (including interrupted, incomplete or unavailable capture) and replay for playable segments on that message. A typed message sent during a call keeps its ordinary presentation, and supplemental audio attachments keep their own attachment controls. Audio replay cannot resend the message. Only actual backend progress follows the usual Thinking collapse.

When microphone access or playback needs action, identify it in the controlling chat. The terminal points to the existing media page and restores interaction focus to the same chat where the platform permits. The desktop presents the permission or activation in place. Speech interruption remains responsive while task status/results update. End/failure restores the ordinary text-chat presentation and keeps any draft.

## Acceptance outcomes

Run the following from the actual chat screens in the terminal dashboard, standalone `ptbk chat` and the Windows and macOS apps.

- Open chat B through normal navigation while another chat with the same agent exists. Start from B's composer and verify only B gets the call, transcript and audio. The chat view is the only launch location and ordinary chat navigation is the only chat selection. Changing views during connection cannot attach the call to a different chat.
- Open a new chat using ordinary agent selection and start voice with an empty history. Verify media setup leaves the history empty and dispatches no reply. Speak the first user message and verify one normal Chat Book, the selected agent, normal first-message routing and a visible recording on the spoken message. Repeat with an unsent draft and with retry after a call setup failure, checking draft and Book identity.
- In an existing chat, send text, start voice, speak, send another typed turn during the active call and then speak again. End voice, send text and start voice again. Verify one chronological history, each accepted input routed once and the new call aware of intervening text. Reopen the chat and verify that both speakers' recorded messages retain their indicators and replay, while typed messages have no voice indicator.
- Use start/end and both mute controls with narrow terminals, composition, resize and preserved drafts. Verify actual states, speaker attribution, provisional/final captions, recording indication and reduced motion. Verify permission/activation guidance and that closing the page or desktop voice view releases media without cancelling independent work. Replaying archived audio does not execute its transcript.
