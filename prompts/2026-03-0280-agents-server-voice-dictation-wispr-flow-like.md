[ ]

[✨🖊] Enhance agent chat dictation (speech-to-text), Wispr Flow-like UX

-   The Agents Server has voice interaction in the chat UI has several parts:
    -   **Speech-to-text** works poorly, it technically works but the experience is bad (stuck listening state, no clear way to stop, no live transcript, no error handling, no correction loop, no smart punctuation/formatting). **<- You are working on this**
    -   **Text-to-speech**, do not need to change anything **<- Do not change this**
    -   **Voice call mode** is separate feature **<- Do not change this**
-   Make voice dictation feel as seamless as Wispr Flow, including real-time refinement patterns (auto punctuation, filler-word cleanup, lightweight formatting like lists) and a strong “confidence + correction” loop. Wispr Flow feature inspiration: works in any text field, auto punctuation, filler removal/backtrack, supports whispering, personal dictionary/snippets/styles (not all need to be implemented, but UX should be inspired by these ideas).
-   Implement an abstraction layer for speech-to-text providers with automatic failover.
-   Implement a backup speech-to-text provider that uses the default browser Web Speech API (where available) as the last-resort fallback.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
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
    -   Must work on desktop and mobile web
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
-   Acceptance criteria
    -   Dictation can be started/stopped repeatedly without page refresh and without “stuck listening” state.
    -   At least one STT provider + browser fallback provider exist behind a shared abstraction.
    -   Both providers of speech-to-text work end-to-end in the chat input, and are **implementing common type interface**
    -   On provider failure, the UI explains what happened and (when possible) seamlessly retries/fails over.
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
