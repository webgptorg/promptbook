[ ] !!!!

[✨🕑] Respect visibility of the agents and do security checkup that it works as supposed

-   There are 3 visibility levels for the agents:
    1. Private - only visible to the logged in users and other agents via `TEAM` commitment
       When non-logged in user tries to access the private agent, they should get 403 Forbidden error
       For now there are no access levels for the agents, so all logged in users can see all private agents
    2. Unlisted - visible to everyone who has the link to the agent and also to other agents via `TEAM` commitment
    3. Public - visible to everyone
-   When the agent is public or unlisted and its `TEAM` teammates are private or unlisted, the agent should be visible and usable to the teammates even for non-logged in users
    -   Anonymous user: [Public agent] --talking internally with--> [Private agent] - _working_
    -   Anonymous user: [Unlisted agent] --talking internally with--> [Private agent] - _working_
    -   Any user: [Any agent] --talking with federated server--> [Private agent] - _403 Forbidden error_
    -   Any user: [Any agent] --talking with federated server--> [Unlisted agent] - _working_
    -   Any user: [Any agent] --talking with federated server--> [Public agent] - _working_
    -   Anonymous user: [Private agent] - _403 Forbidden error_
-   When the agent is visible, you can see its profile and chat with it.
-   But there are also pages of the agent that should be protected for only logged in users regardless of the visibility of the agent, these are:
    -   Profile - Accessible according to the visibility of the agent
    -   Chat - Accessible according to the visibility of the agent
    -   Timeouts - Accessible according to the visibility of the agent
    -   Copy Agent URL - Accessible according to the visibility of the agent
    -   Copy Agent Email - Accessible according to the visibility of the agent
    -   Show QR Code - Accessible according to the visibility of the agent
    -   Open Folder: testing teams - Accessible only for public agents, for private and unlisted agents it should be hidden
    -   Standalone Chat - Accessible according to the visibility of the agent
    -   Edit Book & Chat - Accessible only for logged in users
    -   Textarea Entry - Accessible according to the visibility of the agent
    -   Edit Book - Accessible only for logged in users
    -   Rename Agent - Accessible only for logged in users
    -   Clone agent - Accessible only for logged in users
    -   Delete Agent - Accessible only for logged in users
    -   Update visibility - Accessible only for logged in users
    -   Chat History - Accessible only for logged in users
    -   Usage Analytics - Accessible only for logged in users
    -   Chat Feedback - Accessible only for logged in users
    -   Integration - Accessible only for logged in users
    -   Show System Message - Accessible only for logged in users
    -   Export Agent - Accessible only for logged in users
-   The agent source (the agent book) should be accessible only for logged in users, regardless of the visibility of the agent
-   Exporting or editing the agent should be accessible only for logged in users, regardless of the visibility of the agent
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕑] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕑] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕑] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
