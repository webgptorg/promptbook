# Voice

Voice features — speaking replies aloud (TTS), dictating input (STT), and full **voice calling** (audio in → audio out turn) — are experimental and individually gated by [metadata flags](../configuration.md#chat-behavior):

| Flag | Default | Gates |
| --- | --- | --- |
| `IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED` | `true` | TTS/STT endpoints and the microphone/speaker UI. |
| `IS_EXPERIMENTAL_VOICE_CALLING_ENABLED` | `false` | The combined voice-call endpoint. Disabled ⇒ HTTP 403. |

## Text-to-speech

`POST /api/elevenlabs/tts` — body `{ text, voiceId? }`:

-   Requires `ELEVENLABS_API_KEY` (feature absent otherwise); proxies to the ElevenLabs text-to-speech API with a fixed model and returns the audio stream.
-   `voiceId` is validated against the accepted format; invalid ids yield a 400 with explanation.
-   The agent's preferred voice comes from `META VOICE` (profile `meta.voice`) and is passed by the chat UI as `voiceId` when playing replies aloud. Reply text is normalized for speech (markdown stripped) before synthesis.

## Speech-to-text

`POST /api/openai/v1/audio/transcriptions` — OpenAI-compatible multipart proxy used by the dictation UI:

-   Caller-supplied `model` values are validated against an allowlist (`gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `whisper-1`); anything else is replaced by the priority default, so clients cannot spend against arbitrary paid models.
-   Upload size, `language` (ISO-639-1), and `prompt` length are validated/bounded before forwarding.

## Voice calling

`POST /agents/:agentName/api/voice` — one full audio turn with the agent (multipart: `audio`, optional serialized `thread`):

1. Both flags above must be enabled; then the standard chat gates apply: client-version guard, [agent access](../agents.md#visibility) (team-token accepted), [private mode](../chats.md#private-mode) respected.
2. **STT** — the audio is transcribed to the user message.
3. **Agent turn** — the message runs through the same execution pipeline as [stateless chat](stateless-chat.md) (flagged `isVoiceCall: true`).
4. **TTS** — the reply is synthesized and returned as audio (with the transcript), letting the UI drive a call-like loop.

`OPTIONS` answers with permissive CORS like the chat endpoint.

## UI

The chat input offers dictation (STT) and replies offer playback (TTS) when the flag allows; `/admin/voice-input-test` and `/admin/transcriptions` are admin diagnostic surfaces. Voice preferences (per-user) live with the other [settings](../users/settings-and-notifications.md).
