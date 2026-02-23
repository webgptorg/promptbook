[ ]

[✨🧊] Agents is responding with json when asked, but not respecting a schema, fix it

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~
$ curl https://chutoo.ptbk.io/agents/DtjKRy5Sq3GJUy/api/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ptbk_63bef2d1ffef4becbdd053a3010e03b3" \
  -d '{
  "model": "agent:HAxhVP4iPeaeTz",
  "messages": [
    {
      "role": "user",
      "content": "Dneska mám náladu na těžší procvičování!"
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string"
        }
      },
      "required": ["message"]
    }
  }
}'
{"id":"chatcmpl-i3kitpi7e8m","object":"chat.completion","created":1771839626,"model":"agent:HAxhVP4iPeaeTz","choices":[{"index":0,"message":{"role":"assistant","content":"{\"Context\":\"Paráda — dáme těžší procvičování, ale uděláme to chytře: začneme krátkým „warm‑up“ (snadné vítězství) a pak přidáme tempo.\",\"Task\":\"Mini‑challenge (real life): **You’re at an airport. Your flight is delayed and you need help.**\\n\\nNapiš **4 věty v angličtině**:\\n1) zdvořilý začátek (excuse me / hello)\\n2) co je problém (flight delay)\\n3) co potřebuješ (new ticket / information / hotel)\\n4) doplňující otázka (when / where / how much)\\n\\nLimit: **30–45 sekund**. Piš, jak nejlépe umíš.\",\"Support\":\"Můžeš použít tyto fráze (vyber si):\\n- *Excuse me, could you help me?*\\n- *My flight to ___ is delayed.*\\n- *I need to … / Could you …?*\\n- *When is the next flight?* / *Where can I get information?* / *Do you provide a hotel?*\",\"Feedback\":\"Až to pošleš, opravím to krátce a prakticky: 1 věc pochválím, 1–2 věci zlepšíme a hned to zkusíš říct „more natural“.\",\"Next step\":\"Ještě si vyber: chceš opravy **okamžitě během psaní (A)**, nebo **až po celém textu (B)**? Napiš jen **A** nebo **B** a svoje 4 věty.\"}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":171,"total_tokens":181,"details":{"price":{"value":0,"isUncertain":true},"input":{"tokensCount":{"value":10,"isUncertain":true},"charactersCount":{"value":38},"wordsCount":{"value":10},"sentencesCount":{"value":1},"linesCount":{"value":1},"paragraphsCount":{"value":1},"pagesCount":{"value":1}},"output":{"tokensCount":{"value":171,"isUncertain":true},"charactersCount":{"value":1020},"wordsCount":{"value":171},"sentencesCount":{"value":15},"linesCount":{"value":17},"paragraphsCount":{"value":1},"pagesCount":{"value":1}}}}}
me@DESKTOP-2QD9KQQ MINGW64 ~
$
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🧊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
