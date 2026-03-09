[ ]

[✨🔟] Voice mode: natural agent conversation via OpenAI Realtime (GPT realtime) with best performance + UX

-   @@@
-   The Agents Server has voice interaction in the chat UI has several parts:
    -   **Speech-to-text** works poorly, it technically works but the experience is bad (stuck listening state, no clear way to stop, no live transcript, no error handling, no correction loop, no smart punctuation/formatting). **<- Do not change this**
    -   **Text-to-speech**, do not need to change anything **<- Do not change this**
    -   **Voice call mode** is separate feature **<- You are working on this**
-   Agents Server has a “voice mode” (speech-to-speech) where the user can talk to an agent and get spoken responses, but it currently doesn’t work very well (latency, reliability, naturalness, and UI/UX flow issues).
-   Implement a modern voice mode using the newest OpenAI Realtime API patterns (low-latency speech-to-speech in the browser), prioritizing: fast turn-taking, interruptibility (barge-in), clear UI state, and robust reconnect/cleanup.
-   The OpenAI Realtime API supports low-latency speech-to-speech interactions over WebRTC in browser contexts (recommended) and WebSocket in server contexts; ephemeral client secrets are created via `POST /v1/realtime/client_secrets`; WebRTC SDP exchange uses `POST /v1/realtime/calls` with `Content-Type: application/sdp` and the ephemeral key.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
-   You are working with:

    -   [Existing voice mode implementation](@@@)
    -   [Chat UI voice controls](@@@)
    -   [Server endpoints / auth](@@@)

-   Research + approach (must be reflected in implementation)

    -   Prefer WebRTC for browser voice mode to minimize latency; use WebSocket only when architecture requires a server middle tier.
    -   Use ephemeral client secrets minted server-side and passed to the browser session initialization.
    -   Align to Realtime GA event names and shapes:
        -   `session.update` including `session.type: "realtime"` and audio output voice selection.
        -   New delta events such as `response.output_audio.delta` and `response.output_text.delta` instead of older beta names.

-   UX requirements (natural conversation)

    -   Single “Voice mode” toggle/button per chat.
    -   Clear states: disconnected, connecting, listening, thinking, speaking, muted, error.
    -   Barge-in: if user starts speaking while agent is speaking, stop agent audio immediately and start capturing user speech.
    -   Push-to-talk + hands-free modes:
        -   Hands-free uses server/model VAD for turn detection.
        -   Push-to-talk is explicit (press & hold) and avoids accidental captures.
    -   Show a compact live transcript (both user and agent) while the audio is flowing; allow expanding to full chat transcript.
    -   Audio device controls: choose microphone + output device (where supported).
    -   Accessibility: keyboard shortcuts, visible mic level meter, permission guidance.

-   Technical requirements (client)

    -   Implement a `VoiceModeSession` wrapper that encapsulates:
        -   Creating a Realtime session token (call Agents Server endpoint that proxies `POST /v1/realtime/client_secrets`).
        -   WebRTC PeerConnection setup and SDP exchange against `/v1/realtime/calls`.
        -   Stream handling (mic capture, remote audio output track).
        -   Event handling to update UI state and transcript.
        -   Cleanup on route change/unmount.
    -   Audio pipeline:
        -   Use echo cancellation / noise suppression settings where appropriate.
        -   Maintain a jitter-buffer-friendly playback path (let WebRTC handle most of it; avoid re-decoding/encoding when possible).
    -   Resilience:
        -   Automatic reconnect on transient failures.
        -   Clear fatal error states (unsupported browser, mic permission denied, token expired).

-   Technical requirements (server)

    -   Add an endpoint in Agents Server to mint ephemeral client secrets securely (never expose the long-lived API key to the browser).
        -   Request should use the desired session config (model, voice, modalities) and return the ephemeral key.
    -   Provide server-side guardrails hooks (optional / best-effort): ability to end session, log minimal metadata, and enforce rate limits.

-   Model + configuration

    -   Use a Realtime-capable model (`gpt-realtime` / equivalent in config) with selected voice (e.g. `marin` from docs example) and enable both audio + text outputs so UI can show transcript alongside audio.
    -   Make model/voice configurable via server config/env and allow per-user override in UI (optional).

-   Acceptance criteria
    -   Voice mode conversation feels “phone-call natural”: low latency, smooth back-and-forth, barge-in works.
    -   Connection lifecycle is robust (connect/disconnect repeatedly, no stuck mic, no leaked streams).
    -   UI clearly communicates state and provides recovery actions.
    -   Implementation follows Realtime GA docs (client secrets endpoint + WebRTC calls endpoint + event names) and is easy to maintain.

---

[-]

[✨🔟] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔟] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔟] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
