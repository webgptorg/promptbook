[x]

[✨🎷] When `OpenAiCompatibleExecutionTools` gets the error that some value is not supported, they should try again with stripped down that value.

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

[x]

[✨🎷] When `OpenAiCompatibleExecutionTools` gets the error that some value _(like `temperature`)_ is not supported, they should try again with stripped down that value.

```markdown
Sorry, I encountered an error: All execution tools of LLM Tools from Configuration failed:

1. OpenAI thrown Error: 400 Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.
2. Deepseek (through Vercel) thrown AI_APICallError: Model Not Exist
3. Google (through Vercel) thrown AI_APICallError: models/gpt-5 is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.
```

-   When the prompt fails and error is thrown, there should be some indication in the error message that the value was stripped down
-   The error message should contain the entire process of trying different tools and values
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🎷] When `OpenAiCompatibleExecutionTools` gets the error that some value _(like `temperature`)_ is not supported, they should try again with stripped down that value.

-   This feature works perfectly for the first call of `callChatModel`, but not for the subsequent calls on same instance of `OpenAiCompatibleExecutionTools`.

**For example, this code:**

```typescript
const openAiExecutionTools = new OpenAiExecutionTools({
    isVerbose: true,
    userId: 'playground',
    apiKey: process.env.OPENAI_API_KEY!,
});

const chatPrompt = {
    title: 'Prague',
    parameters: {},
    thread: [
        {
            id: 'msg1',
            from: 'user',
            content: 'Where is Prague ',
        },
        {
            id: 'msg2',
            from: 'assistant',
            content: 'Prague is a beautiful city located in the Czech Republic.',
        },
    ],
    content: `Tell me more`,
    modelRequirements: {
        modelVariant: 'CHAT',
        systemMessage: 'You are an helpful assistant who provides short and concise answers.',
        modelName: 'gpt-5',
        temperature: 1.5,
    },
} satisfies Prompt;

// Call 1
const chatPromptResult = await openAiExecutionTools.callChatModel!(chatPrompt);
console.info({ chatPromptResult });
console.info(colors.cyan(usageToHuman(chatPromptResult.usage)));
console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
console.info(colors.bgGreen(' Chat: ') + colors.green(chatPromptResult.content));

// Call 2
const chatPromptResult2 = await openAiExecutionTools.callChatModel!(chatPrompt);
console.info({ chatPromptResult2 });
console.info(colors.cyan(usageToHuman(chatPromptResult2.usage)));
console.info(colors.bgBlue(' User: ') + colors.blue(chatPrompt.content));
console.info(colors.bgGreen(' Chat: ') + colors.green(chatPromptResult2.content));
```

**Ends up with result:**

```bash
$ npx ts-node ./src/llm-providers/openai/playground/playground.ts
🧸  OpenAI Playground
💬 OpenAI callChatModel call {
  prompt: {
    title: 'Prague',
    parameters: {},
    thread: [ [Object], [Object] ],
    content: 'Tell me more',
    modelRequirements: {
      modelVariant: 'CHAT',
      systemMessage: 'You are an helpful assistant who provides short and concise answers.',
      modelName: 'gpt-5',
      temperature: 1.5
    }
  },
  currentModelRequirements: {
    modelVariant: 'CHAT',
    systemMessage: 'You are an helpful assistant who provides short and concise answers.',
    modelName: 'gpt-5',
    temperature: 1.5
  }
}
(node:20556) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
rawRequest {
    "model": "gpt-5",
    "temperature": 1.5,
    "messages": [
        {
            "role": "system",
            "content": "You are an helpful assistant who provides short and concise answers."
        },
        {
            "role": "user",
            "content": "Where is Prague "
        },
        {
            "role": "user",
            "content": "Prague is a beautiful city located in the Czech Republic."
        },
        {
            "role": "user",
            "content": "Tell me more"
        }
    ],
    "user": "playground"
}
error BadRequestError: 400 Unsupported value: 'temperature' does not support 1.5 with this model. Only the default (1) value is supported.
    at Function.generate (C:\Users\me\work\ai\promptbook\node_modules\openai\src\error.ts:70:14)
    at OpenAI.makeStatusError (C:\Users\me\work\ai\promptbook\node_modules\openai\src\core.ts:424:21)
    at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\core.ts:488:24)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async OpenAiExecutionTools.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleExecutionTools.ts:783:24) {
  status: 400,
  headers: {
    'access-control-expose-headers': 'X-Request-ID',
    'alt-svc': 'h3=":443"; ma=86400',
    'cf-cache-status': 'DYNAMIC',
    'cf-ray': '98b6e66b4a5bcd2b-PRG',
    connection: 'keep-alive',
    'content-length': '247',
    'content-type': 'application/json',
    date: 'Wed, 08 Oct 2025 16:08:59 GMT',
    'openai-organization': 'webgpt-mjmgko',
    'openai-processing-ms': '26',
    'openai-project': 'proj_oai0WTtWHuYqlrCkZgNtfL6A',
    'openai-version': '2020-10-01',
    server: 'cloudflare',
    'set-cookie': '__cf_bm=affW9KCsKYr__rbz0Js4dp9hmv0pxNZEeL6SVGjUPWI-1759939739-1.0.1.1-hwHNVnGQ_xfw_5ovoLau3sPsZvwCq31HnvZab6u3v96aghu_X84U8fPNMRmZ8Wz_MazzSNo4Vji1JLhnhKiLw4IchBFxC6XjkXj4hn89.cE; path=/; expires=Wed, 08-Oct-25 16:38:59 GMT; domain=.api.openai.com; HttpOnly; Secure; SameSite=None, _cfuvid=x4Z8uYaDPOp7XVpJwkdzk5H7_HmCuHQba4WT2hSsUsQ-1759939739752-0.0.1.1-604800000; path=/; domain=.api.openai.com; HttpOnly; Secure; SameSite=None',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'x-envoy-upstream-service-time': '187',
    'x-openai-proxy-wasm': 'v0.1',
    'x-ratelimit-limit-requests': '5000',
    'x-ratelimit-limit-tokens': '2000000',
    'x-ratelimit-remaining-requests': '4999',
    'x-ratelimit-remaining-tokens': '1999956',
    'x-ratelimit-reset-requests': '12ms',
    'x-ratelimit-reset-tokens': '1ms',
    'x-request-id': 'req_4e1cf3c0de2a49838af9b7e8959d366d'
  },
  request_id: 'req_4e1cf3c0de2a49838af9b7e8959d366d',
  error: {
    message: "Unsupported value: 'temperature' does not support 1.5 with this model. Only the default (1) value is supported.",
    type: 'invalid_request_error',
    param: 'temperature',
    code: 'unsupported_value'
  },
  code: 'unsupported_value',
  param: 'temperature',
  type: 'invalid_request_error'
}
Warning Removing unsupported parameter 'temperature' for model 'gpt-5' and retrying request
💬 OpenAI callChatModel call {
  prompt: {
    title: 'Prague',
    parameters: {},
    thread: [ [Object], [Object] ],
    content: 'Tell me more',
    modelRequirements: {
      modelVariant: 'CHAT',
      systemMessage: 'You are an helpful assistant who provides short and concise answers.',
      modelName: 'gpt-5',
      temperature: 1.5
    }
  },
  currentModelRequirements: {
    modelVariant: 'CHAT',
    systemMessage: 'You are an helpful assistant who provides short and concise answers.',
    modelName: 'gpt-5'
  }
}
rawRequest {
    "model": "gpt-5",
    "messages": [
        {
            "role": "system",
            "content": "You are an helpful assistant who provides short and concise answers."
        },
        {
            "role": "user",
            "content": "Where is Prague "
        },
        {
            "role": "user",
            "content": "Prague is a beautiful city located in the Czech Republic."
        },
        {
            "role": "user",
            "content": "Tell me more"
        }
    ],
    "user": "playground"
}
rawResponse {
    "id": "chatcmpl-COR0m6lB4EaVCm5ZQezVkjhDnCRve",
    "object": "chat.completion",
    "created": 1759939740,
    "model": "gpt-5-2025-08-07",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Here’s a quick overview of Prague (Praha):\n\n- Location: Capital of the Czech Republic, in Central Europe, on the Vltava River (region of Bohemia).\n- Population: About 1.3 million (metro ~2.5–2.7 million).\n- Heritage: Historic center is a UNESCO World Heritage Site.\n- Highlights: Old Town Square and Astronomical Clock, Charles Bridge, Prague Castle and St. Vitus Cathedral, Jewish Quarter (Josefov), Wenceslas Square, Vyšehrad, Petrín Hill, Dancing House.\n- History: Capital of the Kingdom of Bohemia; seat of Holy Roman Emperor Charles IV; birthplace of the 1989 Velvet Revolution; Charles University (1348).\n- Culture: “City of a Hundred Spires”; rich classical music scene (Dvořák, Smetana, Mozart ties); excellent beer culture (Pilsner).\n- Language/Currency: Czech; Czech koruna (CZK). EU
and Schengen member; euro not widely used.\n- Climate: Temperate continental—cold winters, warm summers. Best times: spring and fall.\n- Getting around: Walkable center; extensive metro/tram network; Václav Havel Airport (PRG).\n- Food to try: Svíčková, goulash with dumplings, chlebíčky (open-faced sandwiches), koláče; trdelník is popular but touristy.",
                "refusal": null,
                "annotations": []
            },
            "finish_reason": "stop"
        }
    ],
    "usage": {
        "prompt_tokens": 49,
        "completion_tokens": 1010,
        "total_tokens": 1059,
        "prompt_tokens_details": {
            "cached_tokens": 0,
            "audio_tokens": 0
        },
        "completion_tokens_details": {
            "reasoning_tokens": 704,
            "audio_tokens": 0,
            "accepted_prediction_tokens": 0,
            "rejected_prediction_tokens": 0
        }
    },
    "service_tier": "default",
    "system_fingerprint": null
}
[💸] Spending 168 words
{
  chatPromptResult: {
    content: 'Here’s a quick overview of Prague (Praha):\n' +
      '\n' +
      '- Location: Capital of the Czech Republic, in Central Europe, on the Vltava River (region of Bohemia).\n' +
      '- Population: About 1.3 million (metro ~2.5–2.7 million).\n' +
      '- Heritage: Historic center is a UNESCO World Heritage Site.\n' +
      '- Highlights: Old Town Square and Astronomical Clock, Charles Bridge, Prague Castle and St. Vitus Cathedral, Jewish Quarter (Josefov), Wenceslas Square, Vyšehrad, Petrín Hill, Dancing House.\n' +
      '- History: Capital of the Kingdom of Bohemia; seat of Holy Roman Emperor Charles IV; birthplace of the 1989 Velvet Revolution; Charles University (1348).\n' +
      '- Culture: “City of a Hundred Spires”; rich classical music scene (Dvořák, Smetana, Mozart ties); excellent beer culture (Pilsner).\n' +
      '- Language/Currency: Czech; Czech koruna (CZK). EU and Schengen member; euro not widely used.\n' +
      '- Climate: Temperate continental—cold winters, warm summers. Best times: spring and fall.\n' +
      '- Getting around: Walkable center; extensive metro/tram network; Václav Havel Airport (PRG).\n' +
      '- Food to try: Svíčková, goulash with dumplings, chlebíčky (open-faced sandwiches), koláče; trdelník is popular but touristy.',
    modelName: 'gpt-5-2025-08-07',
    timing: {
      start: '2025-10-08T16:08:59.576Z',
      complete: '2025-10-08T16:09:20.273Z'
    },
    usage: { price: [Object], input: [Object], output: [Object] },
    rawPromptContent: 'Tell me more',
    rawRequest: {
      model: 'gpt-5',
      max_tokens: undefined,
      temperature: undefined,
      messages: [Array],
      user: 'playground'
    },
    rawResponse: {
      id: 'chatcmpl-COR0m6lB4EaVCm5ZQezVkjhDnCRve',
      object: 'chat.completion',
      created: 1759939740,
      model: 'gpt-5-2025-08-07',
      choices: [Array],
      usage: [Object],
      service_tier: 'default',
      system_fingerprint: null
    }
  }
}
Usage:
- Cost approximately 0.01 USD
- Saved 0.07 hours of human time
- Written 1145 characters
 User: Tell me more
 Chat: Here’s a quick overview of Prague (Praha):

- Location: Capital of the Czech Republic, in Central Europe, on the Vltava River (region of Bohemia).
- Population: About 1.3 million (metro ~2.5–2.7 million).
- Heritage: Historic center is a UNESCO World Heritage Site.
- Highlights: Old Town Square and Astronomical Clock, Charles Bridge, Prague Castle and St. Vitus Cathedral, Jewish Quarter (Josefov), Wenceslas Square, Vyšehrad, Petrín Hill, Dancing House.
- History: Capital of the Kingdom of Bohemia; seat of Holy Roman Emperor Charles IV; birthplace of the 1989 Velvet Revolution; Charles University (1348).
- Culture: “City of a Hundred Spires”; rich classical music scene (Dvořák, Smetana, Mozart ties); excellent beer culture (Pilsner).
- Language/Currency: Czech; Czech koruna (CZK). EU and Schengen member; euro not widely used.
- Climate: Temperate continental—cold winters, warm summers. Best times: spring and fall.
- Getting around: Walkable center; extensive metro/tram network; Václav Havel Airport (PRG).
- Food to try: Svíčková, goulash with dumplings, chlebíčky (open-faced sandwiches), koláče; trdelník is popular but touristy.
💬 OpenAI callChatModel call {
  prompt: {
    title: 'Prague',
    parameters: {},
    thread: [ [Object], [Object] ],
    content: 'Tell me more',
    modelRequirements: {
      modelVariant: 'CHAT',
      systemMessage: 'You are an helpful assistant who provides short and concise answers.',
      modelName: 'gpt-5',
      temperature: 1.5
    }
  },
  currentModelRequirements: {
    modelVariant: 'CHAT',
    systemMessage: 'You are an helpful assistant who provides short and concise answers.',
    modelName: 'gpt-5',
    temperature: 1.5
  }
}
rawRequest {
    "model": "gpt-5",
    "temperature": 1.5,
    "messages": [
        {
            "role": "system",
            "content": "You are an helpful assistant who provides short and concise answers."
        },
        {
            "role": "user",
            "content": "Where is Prague "
        },
        {
            "role": "user",
            "content": "Prague is a beautiful city located in the Czech Republic."
        },
        {
            "role": "user",
            "content": "Tell me more"
        }
    ],
    "user": "playground"
}
error BadRequestError: 400 Unsupported value: 'temperature' does not support 1.5 with this model. Only the default (1) value is supported.
    at Function.generate (C:\Users\me\work\ai\promptbook\node_modules\openai\src\error.ts:70:14)
    at OpenAI.makeStatusError (C:\Users\me\work\ai\promptbook\node_modules\openai\src\core.ts:424:21)
    at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\core.ts:488:24)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async OpenAiExecutionTools.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleExecutionTools.ts:783:24) {
  status: 400,
  headers: {
    'access-control-expose-headers': 'X-Request-ID',
    'alt-svc': 'h3=":443"; ma=86400',
    'cf-cache-status': 'DYNAMIC',
    'cf-ray': '98b6e6ef9f97cd2b-PRG',
    connection: 'keep-alive',
    'content-length': '247',
    'content-type': 'application/json',
    date: 'Wed, 08 Oct 2025 16:09:20 GMT',
    'openai-organization': 'webgpt-mjmgko',
    'openai-processing-ms': '10',
    'openai-project': 'proj_oai0WTtWHuYqlrCkZgNtfL6A',
    'openai-version': '2020-10-01',
    server: 'cloudflare',
    'set-cookie': '__cf_bm=eLcKBovK_0JsLipyH.0sAwhnyELVw5pybqfv8cpHglY-1759939760-1.0.1.1-MN2MG.aZjC3qi_33QGpUwuKBVqJoKY_x9vQiE36GfBszs0dTXZuAeif6z5zcPJyihqY5.McCg8psKbINIanA89wOSgA8oWAPDSuSO1xaTgE; path=/; expires=Wed, 08-Oct-25 16:39:20 GMT; domain=.api.openai.com; HttpOnly; Secure; SameSite=None, _cfuvid=diBkJ1WFTIHumj6MM6YGtsDSaFzaTcCNkPctFWgddfU-1759939760809-0.0.1.1-604800000; path=/; domain=.api.openai.com; HttpOnly; Secure; SameSite=None',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'x-envoy-upstream-service-time': '26',
    'x-openai-proxy-wasm': 'v0.1',
    'x-ratelimit-limit-requests': '5000',
    'x-ratelimit-limit-tokens': '2000000',
    'x-ratelimit-remaining-requests': '4999',
    'x-ratelimit-remaining-tokens': '1999956',
    'x-ratelimit-reset-requests': '12ms',
    'x-ratelimit-reset-tokens': '1ms',
    'x-request-id': 'req_728b6ba75fa5483f86e35ed9a0bc08d6'
  },
  request_id: 'req_728b6ba75fa5483f86e35ed9a0bc08d6',
  error: {
    message: "Unsupported value: 'temperature' does not support 1.5 with this model. Only the default (1) value is supported.",
    type: 'invalid_request_error',
    param: 'temperature',
    code: 'unsupported_value'
  },
  code: 'unsupported_value',
  param: 'temperature',
  type: 'invalid_request_error'
}
PipelineExecutionError
PipelineExecutionError: All attempts failed. Attempt history:
  1. Model: gpt-5, Stripped: temperature, Error: 400 Unsupported value: 'temperature' does not support 1.5 with this model. Only the default (1) value is supported. (stripped and retried)
Final error: 400 Unsupported value: 'temperature' does not support 1.5 with this model. Only the default (1) value is supported.
    at OpenAiExecutionTools.callChatModelWithRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleExecutionTools.ts:315:23)
    at async Object.proxyTools.callChatModel (C:\Users\me\work\ai\promptbook\src\llm-providers\_common\utils\count-total-usage\countUsage.ts:61:34)
    at async playground (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\playground\playground.ts:121:31) {
  id: 'error-225ad4bd58697eb4'
}
```

-   First call works, second fails without stripping the value and retrying, fix it
-   Every call to `callChatModel` should be independent, so if first call strips down some values, second call should start from scratch with original values
-   Also keep in mind parallel calls to `callChatModel` on same instance of `OpenAiCompatibleExecutionTools`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🎷] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
