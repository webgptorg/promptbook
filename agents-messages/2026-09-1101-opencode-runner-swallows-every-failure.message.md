# The Opencode runner turns every failure into a successful prompt run

While adding the graceful report of a harness which is not logged in, it turned out that
[`OpencodeRunner`](../scripts/run-codex-prompts/runners/opencode/OpencodeRunner.ts) never fails:

```ts
try {
    output = await $runGoScriptWithOutput({
        /* ... */
    });
} catch (error) {
    if (error instanceof Error) {
        output = error.message;
    } else {
        throw error;
    }
}

const usage = parseOpencodeJsonOutput(output);

return { usage };
```

The failure of the Opencode CLI is caught, its output is used as if it were the output of a successful run, and the
round is then reported as a finished prompt. So whatever goes wrong - a crash, a rate limit, a missing login - the
prompt is marked `[x]` done, the (usually unchanged) working tree is committed, and `ptbk coder` moves on to the next
prompt. Every other runner rejects instead, which is what the round retries, the error log and the failure status of
the prompt are built on.

Because of this, the new re-authentication guidance cannot reach the `opencode` harness: `createAuthenticationAwarePromptRunner`
translates a failure of `runPrompt`, and this runner reports no failure to translate. Letting the failure through is
outside the scope of the prompt which found it, so the behavior was preserved as is.
