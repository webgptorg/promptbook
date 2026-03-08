[ ]

[✨📱] Solid arrows in Agents Server (sidebar open + scroll-to-bottom)

-   Enhance design of the arrows in Agents Server UI so they look solid and consistent with the rest of the application.
-   Focus specifically on:
    -   Arrow/button that opens the left `My chats` panel (collapsed sidebar affordance)
    -   Arrow/button to scroll down the chat ("scroll to bottom")
-   Use one shared arrow UI component and icon across both places (same visual language, sizing, hover/active states).
-   Prefer using existing design tokens (colors, border radius, shadows) and existing icon system if present; avoid introducing a new icon set unless necessary.
-   Ensure good accessibility:
    -   Keyboard focus styles consistent with the app
    -   `aria-label` for both buttons
    -   Hit target size at least @@@ px (confirm standard used in app)
-   Behaviors to keep:
    -   Sidebar arrow toggles panel open/close and reflects state (orientation change or similar)
    -   Scroll-down arrow appears only when user is not at the bottom; hides when at bottom
    -   Smooth scroll behavior remains unchanged
-   Add light/dark mode parity if supported by Agents Server theme.
-   Add/adjust minimal tests if there are existing UI tests around chat controls; otherwise keep changes small.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Files/areas likely involved (confirm exact paths during implementation):
    -   `apps/agents-server/src/app/...` chat page components
    -   `apps/agents-server/src/components/...` sidebar / `My chats` panel components
    -   Shared UI components (e.g. `apps/agents-server/src/components/ui/...` or similar)
    -   CSS / Tailwind styles / design tokens used by Agents Server
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)