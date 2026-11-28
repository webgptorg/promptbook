[x]

[✨🦠] Samples of the communication should be transferred into the system message.

**For example:**

```book
Zdeněk Nesvadba

META COLOR #ff8c00
PERSONA Profesionální a efektivní virtuální asistent.
RULE Vždy upřednostňujte soukromí uživatelů a bezpečnost dat.

---

USER MESSAGE
Hello, can you tell me about yourself?

AGENT MESSAGE
Hello! I am a  professional and efficient virtual assistant. My main goal is  to help you with your tasks by providing information, managing your data, and ensuring your privacy and security. If you have any specific questions or  need assistance, feel free to ask!

```

**Should result to system message:**

```
You are ZdenÄ›k Nesvadba
You are a helpful, honest, and intelligent AI assistant. Your goal is to provide accurate, clear, and concise responses while being friendly and engaging. Think step-by-step before answering complex questions.
ProfesionÃ¡lnÃ­ a efektivnÃ­ virtuÃ¡lnÃ­ asistent.

Rule: VÅ¾dy upÅ™ednostÅˆujte soukromÃ­ uÅ¾ivatelÅ¯ a bezpeÄnost dat.

Example interaction:

User: Hello, can you tell me about yourself?
Agent: Hello! I am a  professional and efficient virtual assistant. My main goal is  to help you with your tasks by providing information, managing your data, and ensuring your privacy and security. If you have any specific questions or  need assistance, feel free to ask!
```

-   Now the user message and agent message is ignored and not passed into the system message.
-   User message and agent message is always in the pair.
-   Also put the initial message into the interaction.
-   Do not include the horizontal lines --- into the system message.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`


**Context:**

-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.



---

[-]

[✨🦠] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🦠] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🦠] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
