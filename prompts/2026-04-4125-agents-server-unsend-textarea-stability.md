[ ]

[🦋🌙] Prevent unsent textarea from being rewritten while user is typing

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Problem: When the user types into the “unsent message” textarea, the current value sometimes gets rewritten back-and-forth (likely due to autosave/restore or rehydration logic). This must never happen while the user is actively typing.
-   Requirement: During typing (keydown/input/selection changes), the textarea value must be treated as source-of-truth from the user. No background process should call setState/dispatch that replaces the textarea content.
-   Restore behavior: The unsent message may be restored only when the user leaves the page and returns. On return, the restored text should be injected once (initial mount) and then frozen while typing.
-   Detection: Add/ensure a reliable “isUserTyping” / “userEditing” flag, based on textarea focus + recent input events (with a short debounce window). When true, suppress any reconciliation that would overwrite the textarea.
-   Autosave: Autosave (saving drafts) is allowed, but it must not update the textarea DOM/value from the draft source while the user is editing.
-   Concurrency: If autosave triggers re-render, it must preserve the current user textarea value. Use a “do-not-reapply draft while editing” rule.
-   UX: Avoid flicker. Cursor position should remain stable during typing.
-   Tests (E2E + component/unit as feasible):
    -   When typing, repeated state updates must not alter the textarea value.
    -   When leaving and returning, the last draft should load exactly once.
    -   Cursor position should not jump during typing.
-   Acceptance criteria:
    -   Manual reproduction: type continuously; the text should never revert to a previously saved version until navigation away + back.
    -   Leaving the page and returning should restore the draft content correctly.
-   Open questions / @@:
    -   What is the exact page/route and component name for the unsent message textarea?
    -   Which storage mechanism is used for drafts (localStorage, server DB, url params, etc.)?
    -   Where does the “rewrite back and forth” originate today (specific effect/hook)?
