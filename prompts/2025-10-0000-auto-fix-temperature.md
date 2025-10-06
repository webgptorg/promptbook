[ ]

[✨🎷] When `OpenAiCompatibleExecutionTools` gets the error that some value isnt supported, they should try again with stripped down that value.

For example, this is a kind of error that shouldnt happen:

```markdown
All execution tools of LLM Tools from Configuration failed:

1. **OpenAI** thrown **Error:** 400 Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.
2. **Deepseek (through Vercel)** thrown **AI_APICallError:** Model Not Exist
3. **Google (through Vercel)** thrown **AI_APICallError:** models/gpt-5 is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.
4. **Promptbook remote server** thrown **Error:** 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011CTqu2hCxHmLeeC9pkyVr4"}

Original stack trace:
Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011CTqu2hCxHmLeeC9pkyVr4"}
at Function.generate (/var/www/promptbook-studio/1.14.5/node_modules/@anthropic-ai/sdk/src/error.ts:61:14)
at Anthropic.makeStatusError (/var/www/promptbook-studio/1.14.5/node_modules/@anthropic-ai/sdk/src/core.ts:397:21)
at Anthropic.makeRequest (/var/www/promptbook-studio/1.14.5/node_modules/@anthropic-ai/sdk/src/core.ts:460:24)
at processTicksAndRejections (node:internal/process/task_queues:105:5)
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🎷] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🎷] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🎷] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
