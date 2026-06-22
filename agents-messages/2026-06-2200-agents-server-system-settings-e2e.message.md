# Agents Server `/system/settings` E2E Failure

While verifying the `ptbk coder server` UI change, `npm run test-app-agents-server` failed outside the touched coder-server area.

The failure happened during the Agents Server e2e phase after a successful production build. The Playwright web server reported an unhandled rejection:

```text
Dynamic server usage: Route /system/settings couldn't be rendered statically because it used `headers`.
```

The failing route is `/system/settings`, and the diagnostic points to Next.js dynamic server usage from `headers` during static rendering. This looks unrelated to the coder-server changes in `scripts/run-codex-prompts` and `apps/coder-server`.

