[ ]

[📱💬] Mobile: chat tray (sidebar) open icon must not obstruct message list / composer

-   *(@@@@ Written by agent)*
-   On mobile layout, the floating icon/button used to open the chats tray sidebar sometimes overlaps important UI (message content or the “write a message” composer). This feels visually broken and harms usability.
-   Goal: Ensure the “open chats tray” affordance is always reachable but never obscures interactive/important chat UI elements.
-   Implement with simplicity: prefer a single robust placement strategy over many special-cases.
-   Define the expected behavior on mobile breakpoints:
    -   The open-tray button must not overlap the message composer (input, send button, attachments) at any time.
    -   The open-tray button must not cover the last visible message bubble in a way that prevents reading or interaction (selection/copy/links).
    -   When the user scrolls, the button behavior should be consistent (either pinned to a safe area or integrated into an existing header/nav).
-   UX proposal options (choose one; keep others as fallback):
    -   Preferred: move the button into the chat header/top bar (e.g., left side “chats” icon), removing the floating overlay entirely on mobile.
    -   Alternative: keep it floating but reserve layout space for it (e.g., add bottom padding/margin in the message list and composer safe-area so it never overlaps content).
    -   Alternative: contextual hide/show (e.g., hide while keyboard is open or while user is actively typing; show on scroll-up / idle).
-   Must consider device safe areas (iOS notch/home indicator) and the on-screen keyboard:
    -   When the keyboard opens, recompute safe placement so the button never overlaps the composer.
    -   Ensure it respects CSS env(safe-area-inset-*) where applicable.
-   Add acceptance checks that cover the “sometimes” nature:
    -   Test on multiple viewport heights (short devices) and in both portrait/landscape.
    -   Test with long conversations (scroll), with/without the keyboard open.
    -   Test with different message types (long text, code blocks, images) near the bottom.
-   Telemetry/debugging (optional but recommended): add a temporary dev-only visual boundary / console warning when the button overlaps the composer bounding box (guarded behind @@@ flag) to validate fixes quickly.
-   You are working with the [Agents Server](apps/agents-server)
-   Touch points / likely files (final list after quick code search):
    -   [apps/agents-server] @@@ (chat page/layout component where the floating button is rendered)
    -   [apps/agents-server] @@@ (CSS/tailwind styles for mobile breakpoints)
    -   [apps/agents-server] @@@ (chats tray/sidebar component)
-   Add the change into the [changelog](changelog/_current-preversion.md)
