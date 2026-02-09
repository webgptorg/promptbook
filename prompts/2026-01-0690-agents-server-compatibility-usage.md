[x] ~$0.39 by OpenAI Codex `gpt-5.2-codex`

[✨🎏] Report usage when using agents through the compatibility mode for example OpenAI compatibility or Open Router compatibility mode.

**Now:**

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ curl http://localhost:4440/agents/c3GobjqbReBto8/api/openai/v1/chat/completions   -H "Content-Type: application/json"   -H "Authorization: Bearer ptbk_751badab95d041a6aae9c2e64c99a820"   -d '{
    "model": "agent:c3GobjqbReBto8",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
a{"role": "user", "content": "Hello!"}\x0a]\x0a}';b038ccc8-de9d-436e-b3f1-f51bce0837a0{"id":"chatcmpl-w50oxyww8pc","object":"chat.completion","created":1770042224,"model":"agent:c3GobjqbReBto8","choi
ces":[{"index":0,"message":{"role":"assistant","content":"Hello! How can I assist you today?"},"finish_reason":"stop"}],"usage":{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0}}
```

**Should be:**

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ curl http://localhost:4440/agents/c3GobjqbReBto8/api/openai/v1/chat/completions   -H "Content-Type: application/json"   -H "Authorization: Bearer ptbk_751badab95d041a6aae9c2e64c99a820"   -d '{
    "model": "agent:c3GobjqbReBto8",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
a{"role": "user", "content": "Hello!"}\x0a]\x0a}';b038ccc8-de9d-436e-b3f1-f51bce0837a0{"id":"chatcmpl-w50oxyww8pc","object":"chat.completion","created":1770042224,"model":"agent:c3GobjqbReBto8","choi
ces":[{"index":0,"message":{"role":"assistant","content":"Hello! How can I assist you today?"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":6,"total_tokens":7,details: {...}}}
```

-   Promptbook isn't working with the tokens. Instead of tokens, use words.
-   Count the words using `countWords` function
-   In the details use the `Usage` object which is native for Promptbook
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🎏] Fix the `usage.details` in the Agents Server OpenAI Compatibility mode.

```bash
$ curl https://chutoo-test.ptbk.io/agents/NybzgAFteBo2zz/api/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ptbk_726c2caba55544c385ee389fa4294eb7" \
  -d '{
    "model": "agent:NybzgAFteBo2zz",
    "messages": [
      { "role": "user", "content": "Ahoj" }
    ]
  }'
{"id":"chatcmpl-9kr4gx562yu","object":"chat.completion","created":1770635465,"model":"agent:NybzgAFteBo2zz","choices":[{"index":0,"message":{"role":"assistant","content":"Ahoj! Jak se dnes máš?\n\n[😟 Nic moc](?message=Nic%20moc.)\n[😐 Jde to](?message=Jde%20to.)\n[🙂 Skvěle](?message=Skv%C4%9Ble%2C%20poj%C4%8Fme%20na%20to)"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":29,"total_tokens":30,"details":{"price":{"value":0,"isUncertain":true},"input":{"tokensCount":{"value":0,"isUncertain":true},"charactersCount":{"value":0,"isUncertain":true},"wordsCount":{"value":0,"isUncertain":true},"linesCount":{"value":0,"isUncertain":true},"sentencesCount":{"value":0,"isUncertain":true},"paragraphsCount":{"value":0,"isUncertain":true},"pagesCount":{"value":0,"isUncertain":true}},"output":{"tokensCount":{"value":0,"isUncertain":true},"charactersCount":{"value":0,"isUncertain":true},"wordsCount":{"value":0,"isUncertain":true},"linesCount":{"value":0,"isUncertain":true},"sentencesCount":{"value":0,"isUncertain":true},"paragraphsCount":{"value":0,"isUncertain":true},"pagesCount":{"value":0,"isUncertain":true}}}}}
```

-   Now Everything is 0,0,0,0,...
-   The `usage.details` should be filled with the correct values for both input and output.
-   Use the available utility functions to aggregate the real usage and compute the words, lines, paragraphs, etc.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎏] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎏] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
