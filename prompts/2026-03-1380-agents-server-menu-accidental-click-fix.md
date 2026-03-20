[x] ~$0.5650 27 minutes by OpenAI Codex `gpt-5.4`

[🖱️📂] Fix accidental clicking into hover-opened menu

-   Overview: Prevent the hover-opened menu from blocking clicks on page content while preserving fast, discoverable menu access; guarantee perfect UX for both: (1) intentionally opening and using the menu, (2) moving the mouse across the top and clicking page content without accidental clicks being captured by the menu.

-   Problem summary:

    -   Currently the app opens menu items on hover with a visible delay and leaves them interactive; when a user moves the mouse from the top toward the page content, the hover-opened dropdown can sit above content and catch clicks that were intended for the page.
    -   This results in accidental clicks inside the menu and a frustrated UX when users try to click content under a transient menu.
    -   Context: Agents Server menu structure and behavior referenced in common project notes for the app.

-   Goals (success criteria):

    -   Hover should remain a lightweight preview that does not block page interactions unless the user commits to the menu.
        -   It should have some delay before opening to prevent accidental triggers
        -   When clicking on the menu item, it should open the menu immediately and make it interactive.
    -   Click-to-open should be fully interactive and stable for users who intentionally open and use the menu.
    -   Quick mouse movement from top to page should never result in accidental menu clicks.

-   You are working with the [Agents Server](apps/agents-server)

![alt text](prompts/screenshots/2026-03-1380-agents-server-menu-accidental-click-fix.png)

