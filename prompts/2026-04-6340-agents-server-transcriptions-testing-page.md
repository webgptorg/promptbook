[ ] !

[🛰️🎙️] Add transcriptions long-running test page (browser SpeechRecognition continuous restart)

-   Add a new testing page in the Agents Server menu named **Transcriptions**.
-   This page is similar to the existing voice input test page, but it targets **long-running transcriptions** (e.g. up to 1 hour).
-   The transcription should progressively output text during the run. If a provider stalls / stops (notably browser Web Speech API), the page should automatically restart it so that the overall UX is “one long transcription session”.
-   Prefer reuse of existing speech-to-text infrastructure:
    -   Use the existing speech-to-text abstractions and failover orchestration in `apps/agents-server/src/utils/speech-to-text/` (e.g. provider factory + partial/final callbacks).
    -   Reuse the existing dictionary/types and integrate with the existing UI design patterns used by the voice test page.
-   If the existing Web Speech integration isn’t suitable for long runs, extend it with a “session wrapper” that:
    -   keeps a single external session state (recording/running/stopped),
    -   restarts the internal provider repeatedly when it ends unexpectedly,
    -   deduplicates/reconciles overlapping partial results (so the text stream doesn’t flicker wildly),
    -   keeps an ordered list of “final chunks” so transcription output is stable.
-   UI requirements for the new page (testing-only, not production behavior):
    -   Controls: Start / Stop; optional language selection; optional provider mode toggles (if already supported by existing code).
    -   Output: a live-updating transcript area showing partial progress and final chunks.
    -   Status: show elapsed time since session start, current provider name, and last event (partial/final/error/restart).
    -   Debug: include a collapsible “Diagnostics” panel showing provider limitations / supportsPartials and any error codes.
    -   Guardrails: disable Start while already running; Stop should immediately end and prevent further restarts.
-   Implementation sketch (high level):
    -   Build a new page route under the Agents Server app (inside `apps/agents-server/src/app/`) for `/transcriptions` (or match existing menu routing conventions).
    -   Add a new client component that owns one long-running session state and aggregates transcript chunks.
    -   Use `createDefaultSpeechRecognition()` and `SpeechToTextFailoverRecognition` where possible, and if needed add a higher-level wrapper around it for repeated restart (especially for browser web-speech).
-   Known existing building blocks to hook into (for developer orientation):
    -   `SpeechToTextFailoverRecognition` exposes telemetry + providers and already models partial/final events via callbacks. It also includes stall watchdog logic and provider restart telemetry events.
    -   `BrowserWebSpeechToTextProvider` uses `BrowserSpeechRecognition` and emits partial/final via event stream.
    -   `createDefaultSpeechRecognition` creates failover recognition with provider priority `['openai', 'browser']`.
-   Sources (for implementation):
    -   `SpeechToTextFailoverRecognition` and telemetry/stall logic:【apps/agents-server/src/utils/speech-to-text/SpeechToTextFailoverRecognition.ts】
    -   `BrowserWebSpeechToTextProvider` partial/final event forwarding:【apps/agents-server/src/utils/speech-to-text/providers/BrowserWebSpeechToTextProvider.ts】
    -   Speech-to-text provider registry and failover creation:【apps/agents-server/src/utils/speech-to-text/createDefaultSpeechRecognition.ts】
