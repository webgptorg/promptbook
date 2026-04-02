[ ]

[✨𓀛] Allow to enforce server language

-   There is a metadata `SERVER_LANGUAGE` which determines the default language of the server
-   This is more like a soft option. This option can be overridden by the user in the control panel.
-   Add new medatada item `IS_SERVER_LANGUAGE_ENFORCED` Which can be `true` or `false`, and when `true`, the server will have only one language determined by `SERVER_LANGUAGE`
-   When true there will be no option to change the language in the control panel
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨𓀛] Go throught `Czech` translations and make sure that every message on agents server is translated

-   This is relevant when `SERVER_LANGUAGE` is `cs`
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨𓀛] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨𓀛] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
