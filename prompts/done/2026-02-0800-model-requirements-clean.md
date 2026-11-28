[x] ~$0.13 6 minutes by OpenAI Codex `gpt-5.1-codex-mini`
[x] ~$0.44 9 minutes by OpenAI Codex `gpt-5.1-codex-mini`

---

[x] _<- Maybe do manually - Remove `metadata`, `notes` and `parentAgentUrl` from `src/book-2.0/agent-source/AgentModelRequirements.ts` _

[✨🏄] Clean up the model requirements:

**How the model requirements look like:**

```json
{
    "systemMessage": "...",
    "modelName": "gemini-2.5-flash-lite",
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 50,
    "metadata": {
        "agentName": "Praha 13 2026-02 (monolit)",
        "PERSONA": "You are a helpful, honest, and intelligent AI assistant. Your goal is to provide accurate, clear, and concise responses while being friendly and engaging. Think step-by-step before answering complex questions.\nJsi asistent pro zaměstnance Prahy 13.\nOdpovídáš v češtině a poskytujte užitečné informace o úředních postupech, projektech a službách Prahy 13. Buď profesionální, přátelský a nápomocný.",
        "isClosed": true
    },
    "notes": [
        "Inherited Adam FROM https://core-test.ptbk.io/agents/adam",
        "Todo: USE SEARCH ENGINE",
        "!!!! <- Maybe use FORMAT commitment + Transfer to Adam",
        "CONTEXT Důležitá nařízení / směrnice:\n\nNařízení tajemníka\n360/2021 Pracovní řád ÚMČ Praha 13\n329/2019 Provozní řád ÚMČ Praha 13\n389/2024 Spisový řád ÚMČ Praha 13\n409/2025 Ekonomická směrnice\n378/2023\nPostupy pro jednotné číslování smluv, dohod, objednávek a jejich náležitosti při vystavování, podepisování a archivaci. Správa v SW Ginis\n\n\nSměrnice starosty\n1/2025 Zadávání veřejných zakázek Městskou částí Praha 13 dle zákona č. 134/2016 Sb., o zadávání veřejných zakázek\n1/2016 Pravidla pro přijímání petic, stížností, oznámení, podnětů a vyřizování podání na možná korupční jednání, podaných orgánům MČ Praha 13\n1/2022 Uzavírání smluv a dohod městskou částí Praha 13\n1/2023 O aplikaci zákona č. 340/2015 Sb., o zvláštních podmínkách účinnosti některých smluv, uveřejňování těchto smluv a o registru smluv (zákon o registru smluv) na Úřadu MČ Praha 13\n2/2023 Přijímání a vyřizování žádostí o poskytnutí informací podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, ve znění pozdějších předpisů"
    ],
    "parentAgentUrl": null,
    "tools": [
        {
            "name": "get_current_time",
            "description": "Get the current date and time in ISO 8601 format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional timezone name (e.g. \"Europe/Prague\", \"UTC\", \"America/New_York\")."
                    }
                },
                "required": []
            }
        }
    ],
    "samples": [
        {
            "question": null,
            "answer": "**Dobrý den, jsem Váš interní asistent pro vnitřní předpisy ÚMČ Praha 13.**\n\nMým úkolem je usnadnit Vám orientaci ve **směrnicích starosty** a **nařízeních tajemníka**. Popište mi, jakou situaci řešíte, a já pro Vás vyhledám správný postup.\n\n**S čím Vám mohu v tuto chvíli poradit?**"
        }
    ],
    "knowledgeSources": [
        "https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf",
        "https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf",
        "https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf",
        "https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf"
    ]
}
```

**But should look like:**

```json
{
    "systemMessage": "...",
    "modelName": "gemini-2.5-flash-lite",
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 50,
    "tools": [
        {
            "name": "get_current_time",
            "description": "Get the current date and time in ISO 8601 format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional timezone name (e.g. \"Europe/Prague\", \"UTC\", \"America/New_York\")."
                    }
                },
                "required": []
            }
        }
    ],
    "samples": [
        {
            "question": null,
            "answer": "**Dobrý den, jsem Váš interní asistent pro vnitřní předpisy ÚMČ Praha 13.**\n\nMým úkolem je usnadnit Vám orientaci ve **směrnicích starosty** a **nařízeních tajemníka**. Popište mi, jakou situaci řešíte, a já pro Vás vyhledám správný postup.\n\n**S čím Vám mohu v tuto chvíli poradit?**"
        }
    ],
    "knowledgeSources": [
        "https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf",
        "https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf",
        "https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf",
        "https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf"
    ]
}
```

-   The `metadata`, `notes` and `parentAgentUrl` should be removed - These parameters are interesting, but they are out of the scope of the low-level abstract things which Promptbook passes into the third-party engines. They are more important internally for the Promptbook
-   DO NOT create any extra utilities like `sanitizeAgentModelRequirements`, theese extra `metadata`, `notes` and `parentAgentUrl` should not be passed into the agent requirements at all - Remove it from `src/book-2.0/agent-source/AgentModelRequirements.ts`
-   Agent model requirements are like a compiled version of the agent source containing the low-level things like system messages, temperature, model, etc.
-   Now there are two model requirement types you are working with [`AgentModelRequirements`](src/book-2.0/agent-source/AgentModelRequirements.ts), the second one is deprecated.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
-   It should work in the [Agents Server](apps/agents-server)

![alt text](prompts/screenshots/2026-02-0800-model-requirements-clean.png)

---

[-]

[✨🏄] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🏄] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🏄] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
