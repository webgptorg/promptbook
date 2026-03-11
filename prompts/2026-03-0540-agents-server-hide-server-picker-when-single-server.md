[ ]

[✨🐸] Hide server picker in Agents Server menu bar when only one server is configured

-   *(@@@@ Written by agent)*
-   In Agents Server UI, there is a “server picker” in the header / menu bar used to switch between federated servers.
-   When the app is running against just one server (no federation / no other servers configured or discoverable), do not show this picker at all (reduce UI noise and avoid confusing users).
-   Define “just one server” as: @@@ (e.g. `knownServers.length <= 1`, or `federationEnabled === false`, or only `self` server present).
-   The header layout should not look broken when picker is hidden (spacing/alignment remains consistent).
-   If federation becomes available later (e.g. after config change, login, or async discovery), the picker should appear without requiring full page refresh.
-   Keep the logic centralized (avoid duplicating the same `if (servers.length === 1)` checks in multiple components).
-   Add minimal regression coverage:
    -   With 1 server: picker not rendered
    -   With 2+ servers: picker rendered and functional
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Files / places this PRD touches:
    -   Header / menu bar component in [Agents Server](apps/agents-server) @@@
    -   Server federation / servers list state (where the picker reads available servers from) @@@
    -   Styling/layout for the header area around the picker @@@
    -   Add/adjust tests for the header/menu bar behavior @@@
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐸] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐸] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐸] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐸] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)