# Timing-Unsafe Token Comparison in `/api/internal/user-chat-timeouts/run`

While working on `prompts/2026-06-0760-security-timing-unsafe-token-comparisons.md` (fixing timing-unsafe `===` / `!==` comparisons for secrets and tokens), I found a **fourth** instance of the same vulnerability that was not listed in the prompt.

## Where

[`apps/agents-server/src/app/api/internal/user-chat-timeouts/run/route.ts`](apps/agents-server/src/app/api/internal/user-chat-timeouts/run/route.ts) line 67 — `token === resolveUserChatWorkerInternalToken()` inside `isAuthorizedInternalWorkerRequest`.

## Why it matters

The third bullet of the prompt explicitly says that **"The shared worker token protects all 'internal' worker tick routes"**, but only enumerates two of those routes (`agent-runner-limits` and `user-chat-jobs/run`). The `user-chat-timeouts/run` route uses the exact same `x-user-chat-worker-token` header and the same `resolveUserChatWorkerInternalToken()` source, so it has the **same** timing-attack surface as the two listed routes — leaking it lets an attacker drive arbitrary user-chat-timeout worker ticks.

## What I did

Per the instruction **"Do only the change described in the prompt"**, I did **not** modify this route. Only the three explicitly listed places (`session.ts`, `teamInternalAgentAccess.ts`, `agent-runner-limits/route.ts`, `user-chat-jobs/run/route.ts`) were updated to use the new shared `isTimingSafeEqualString` helper.

## Suggested follow-up

Apply the same one-line fix to `user-chat-timeouts/run/route.ts`:

```ts
import { isTimingSafeEqualString } from '../../../../../../../../src/utils/isTimingSafeEqualString';
// …
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-user-chat-worker-token');
    return isTimingSafeEqualString(token, resolveUserChatWorkerInternalToken());
}
```

The shared helper already handles `null` headers gracefully, so the change is mechanical.
