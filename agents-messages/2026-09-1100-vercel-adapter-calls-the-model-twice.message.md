# The Vercel adapter calls the chat model twice for every prompt

While migrating [`createExecutionToolsFromVercelProvider`](../src/llm-providers/vercel/createExecutionToolsFromVercelProvider.ts)
to the current Vercel AI SDK model interface, it turned out that `callChatModel` calls `model.doGenerate(rawRequest)`
**twice** for a single prompt:

```ts
const rawResponse = await (async () => await model.doGenerate(rawRequest))().catch((error) => {
    /* ... */
});

await model.doGenerate(rawRequest);
//    ^^^ The result of this second call is thrown away
```

The second call is not read anywhere, so every chat prompt made through `@promptbook/vercel`, `@promptbook/google` and
`@promptbook/deepseek` is sent to the provider twice. That doubles the latency and the money spent on every call, and
the reported `usage` covers only the first of the two requests, so the counted spending is **half** of the real one.

The double call looks like a leftover from debugging, not an intentional retry - there is no retry condition and no
fallback to the second result. Removing the second `doGenerate` call is outside the scope of the dependency fix which
found it, so the behavior was preserved as is.
