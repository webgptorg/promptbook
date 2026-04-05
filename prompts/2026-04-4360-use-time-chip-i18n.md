[ ]

[🌙🕒] Fix USE TIME chip + popup modal translation and language-aware time formatting

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Reproduce: in an agent chat, trigger the `set_timeout` tool and open the chip/popup for the shown “USE TIME” / timeout-time value; currently the chip renders broken as only `  : PM`.
-   Fix rendering bug: chip label must be a complete, human-readable, non-technical time string (no missing hour component). Ensure the source value and parsing are consistent across chip and modal.
-   Translation: both the chip text and the popup modal (including any labels like “Use time”, “Cancel/Snooze/View advanced”, etc.) must use i18n keys so they are properly translated.
-   Language-aware time format: time should be formatted using the user’s active language/locale (and timezone where applicable) via a single shared formatting utility instead of manual string concatenation.
    -   Chip shows the primary local time.
    -   Popup modal includes the same time in the correct localized format plus any secondary representations already shown today (relative time / timezone / exact timestamp), all using locale-aware formatting.
-   Consistency + DRY: introduce or reuse a shared formatter used by both chip and modal to avoid divergent outputs.
-   Accessibility regression check: ensure chip remains keyboard-focusable and popup has correct accessible labels after changes.
-   Testing checklist (manual / QA):
    -   In at least 2 locales (e.g., English and a non-English locale supported by the app), verify chip label shows complete time (e.g., `Timeout: 5:30 PM` vs localized equivalent) and popup modal matches.
    -   Verify no visual artifacts like extra spaces or missing digits.
    -   Verify advanced fields still show correct exact UTC due timestamp and milliseconds if present.
-   Use the existing i18n/formatting patterns from any similar timeout chip work; if there is no existing shared utility, create one minimally and update both components to use it.
-   Do NOT change any backend behavior; keep this UI/formatting + i18n update only.
-   Related QA reference: see [USE TIMEOUT Chip QA](apps/agents-server/USE_TIMEOUT_CHIP_QA.md) and extend it with the “USE TIME” chip translation + locale formatting regression case.
