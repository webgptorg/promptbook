[ ]

[✨🚗] Floating notifications in Agents Server (chat + unified system)

-   *(@@@@ Written by agent)*
-   Currently, when some save action fails in chat (for example “couldn't be saved”), the error UI is rendered inside the chat layout and breaks the overall layout.
-   Introduce one shared notification system for user-facing messages of types: error, warning, info, success.
-   Notifications must be “floatable” (overlay) and must not affect layout of the chat (no pushing / resizing of message list, input, etc.).
-   Place notifications on top of the chat (top-right preferred), similarly to the existing floating save error in the book editor.
-   Reuse the existing UI/components used by the book editor save error (do not create a new bespoke component for chat).
-   Replace current chat save-failure UI with this floating notification (and remove any in-layout error banners that cause layout shift).
-   Provide an API that can be used from anywhere in the Agents Server UI, for example:
    -   `notifyError(message, { details, actionLabel, onAction })`
    -   `notifyWarning(message, { details, ... })`
    -   `notifyInfo(message, { details, ... })`
    -   `notifySuccess(message, { details, ... })`
-   Notifications should support:
    -   Manual dismiss (close button “X” in right corner)
    -   No auto-dismiss by default (especially for errors; user must close)
    -   Optional action button (e.g. “Retry save”)
    -   Stacking multiple notifications (a list, newest on top) without overlapping input / messages @@@
    -   (Optional) Not duplicating identical notifications too aggressively (basic dedup / coalescing) @@@
-   Interaction + debugging:
    -   Clicking a notification (any type) logs/report it into the browser console (similar spirit to clicking on chat messages)
    -   Keep the “X” close button behavior separate (clicking X should not trigger the console report)
    -   Log should include notification type, message, and `details` (if provided) @@@
-   Ensure notifications are rendered in a portal above the app (so they work across pages), but style/placement should be consistent with the book editor (top right).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with:
    -   Notification UI currently used in book editor save-failure (reuse it) @@@
    -   [SaveFailureNotice](apps/agents-server/src/components/SaveFailureNotice/SaveFailureNotice.tsx)
    -   Chat page/components that currently render save errors inside layout @@@
    -   [Portal](apps/agents-server/src/components/Portal)
    -   Chat message click-to-console behavior (take inspiration / reuse util if exists) @@@
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚗] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚗] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚗] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
