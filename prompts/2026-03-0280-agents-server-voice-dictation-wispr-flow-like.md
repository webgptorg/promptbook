[ ]

[✨🖊] Enhance agent chat dictation (speech-to-text) + reliable text-to-speech, Wispr Flow-like UX

-   *(@@@@ Written by agent)*
-   The Agents Server has voice interaction in the chat UI, but currently:
    -   Speech-to-text works well, but we want to enhance UX to feel like Wispr Flow (fast, “just works”, edits while you speak, minimal friction).
    -   Text-to-speech (playing agent responses) feels quirky, sometimes lags, and overall does not work reliably.
-   Make voice dictation feel as seamless as Wispr Flow, including real-time refinement patterns (auto punctuation, filler-word cleanup, lightweight formatting like lists) and a strong “confidence + correction” loop. Wispr Flow feature inspiration: works in any text field, auto punctuation, filler removal/backtrack, supports whispering, personal dictionary/snippets/styles (not all need to be implemented, but UX should be inspired by these ideas).
-   Implement an abstraction layer for speech-to-text providers with automatic failover.
-   Implement a backup speech-to-text provider that uses the default browser Web Speech API (where available) as the last-resort fallback.
-   Make text-to-speech resilient: reduce perceived latency, handle errors, avoid UI lockups, and guarantee a predictable stop/pause/resume behavior.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
-   You are working with:
    -   [Existing voice/dictation implementation](@@@)
    -   [Chat UI](@@@)
    -   [TTS playback code path](@@@)

-   Dictation UX requirements (Wispr Flow-like)
    -   Provide a single primary mic control with clear states: idle, listening, processing, error, disabled (permission).
    -   While listening, show live transcript as it’s recognized (interim results) and keep the caret stable.
    -   Provide “backtrack” (quick undo of the last dictated chunk) and “replace selection” behavior.
    -   Provide quick correction affordance: allow user to click transcript to edit before send; when edited, feed this correction into a local “dictionary” store (at minimum: custom words list) to improve future recognition choices.
    -   Provide lightweight refinement options (configurable):
        -   Auto punctuation and capitalization.
        -   Optional filler removal for common fillers (“um”, “uh”, “like”) when appropriate.
        -   Optional list formatting when user says “new line”, “bullet”, “numbered list”.
    -   Support “whisper mode” as UX copy/setting (technical implementation depends on provider capabilities; at minimum adjust VAD thresholds / sensitivity if we do client-side VAD).
    -   Must work on desktop and mobile web (best-effort on iOS Safari).

-   Speech-to-text provider abstraction
    -   Introduce a small interface, e.g. `SpeechToTextProvider` with:
        -   `isSupported()`
        -   `start({ language, onPartial, onFinal, onError })`
        -   `stop()`
        -   `abort()`
        -   `getDiagnostics()` (optional)
    -   Support configuring a provider priority list (primary, secondary, browser fallback).
    -   Automatic failover rules:
        -   If provider errors during init, attempt next provider.
        -   If provider stalls (no partials for N seconds while audio input is non-silent), attempt restart once, then failover.
        -   If permissions denied, show actionable UI (re-request, open browser settings).
    -   Add telemetry hooks (console + optional server logging) capturing: provider used, init time, first partial time, finalization time, error codes (no raw audio stored).

-   Backup provider: Browser Web Speech API
    -   Implement provider using `window.SpeechRecognition || window.webkitSpeechRecognition`.
    -   Clearly communicate limitations per browser (Safari/Firefox support differences) and auto-hide the option when unsupported.

-   Text-to-speech (agent response playback) reliability improvements
    -   Refactor to a `TextToSpeechProvider` abstraction (even if only one provider exists now) with:
        -   `speak({ text, voice, rate, pitch })` returning a cancellable handle / promise
        -   `stop()` / `pause()` / `resume()` (where supported)
        -   `isSupported()`
    -   Implement a robust playback queue:
        -   Avoid overlapping audio when multiple agent messages arrive.
        -   Support “Play” per-message and optionally “Auto-play latest agent response”.
        -   Cancel/interrupt when user starts dictation or starts a new playback.
    -   Latency / lag mitigation:
        -   Split long texts into chunks and prefetch/prepare next chunk while current is playing.
        -   Show progress UI (playing, buffering, failed) with retry.
    -   Fallback behavior:
        -   If primary TTS fails, fall back to browser `speechSynthesis` (if not already the primary), otherwise degrade gracefully (disable button, show error).
    -   Ensure “Stop” is immediate (no lingering audio) and that navigation/unmount cleans up.

-   Acceptance criteria
    -   Dictation can be started/stopped repeatedly without page refresh and without “stuck listening” state.
    -   At least one STT provider + browser fallback provider exist behind a shared abstraction.
    -   On provider failure, the UI explains what happened and (when possible) seamlessly retries/fails over.
    -   TTS playback:
        -   No more duplicated playback, no long hangs; stop/pause/resume works predictably.
        -   For long responses, playback starts quickly and continues smoothly.
    -   UX resembles Wispr Flow: minimal friction, fast start/stop, live transcript, correction loop, smart punctuation/formatting (at least in a minimal form).

---

[-]

[✨🖊] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🖊] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🖊] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)