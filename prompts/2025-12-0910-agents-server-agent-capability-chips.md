[ ]

[✨🔪] Show the chips with the capabilities of the agent under his description

-   Here is an example of an agent with multiple capabilities defined in its source code:

```book
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
USE BROWSER
USE SEARCH ENGINE
KNOWLEDGE https://justice.gov/legal-resources
```

-   You should display small chips (badges) under the agent's description that indicate the capabilities of the agent based on the commitments used in its source code.
-   The capabilities to show are:
    -   `USE BROWSER` -> Chip with text "Browser"
    -   `USE SEARCH ENGINE` -> Chip with text "Search Engine"
    -   `KNOWLEDGE <url>` -> Chip with text <url> or just "Knowledge"
-   The chips should be visually distinct and easy to read.
-   Each chip should have a small icon representing its capability (e.g., a globe icon for "Browser", a magnifying glass for "Search Engine", and a book or document icon for "Knowledge")., use `lucide-react` icons for this purpose.
-   The chips should be displayed in the agent detail view in the `Agents Server` application
-   Also show the chips in the agent list view, so user can see the capabilities of each agent at a glance.
-   Theese chips should be parsed and stored and transfered through [`AgentBasicInformation` interface](/src/book-2.0/agent-source/AgentBasicInformation.ts)
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-0910-agents-server-agent-capability-chips.png)
![alt text](screenshots/2025-12-0910-agents-server-agent-capability-chips-1.png)

---

[-]

[✨🔪] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🔪] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🔪] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
