[ ]

[✨😣] Allow to restrict IP address of the clients via env variabile `RESTRICT_IP` or/and `Metadata`

-   Work for both ipv4 and ipv6 addresses
-   When `RESTRICT_IP` env variable is set, then only clients connecting from that IP address are allowed to use the Agents Server, all other clients get 403 Forbidden response
-   When `RESTRICT_IP` is not set, then all clients are allowed _(current behaviour)_
-   Allow to set ranges of IP addresses in CIDR notation, for example `192.168.1.0/24`
-   Allow to set multiple IP addresses / ranges separated by comma, for example `192.168.1.0/24,10.0.0.1`
-   Allow to set the restriction also via `Metadata` in the database, so that user can change the restriction without changing the environment variable
-   Metadata key should be `RESTRICT_IP` and has priority over the environment variable `RESTRICT_IP`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨😣] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨😣] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨😣] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
