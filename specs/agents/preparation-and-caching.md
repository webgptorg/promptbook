# Preparation and Caching

Compiling an agent (resolving [inheritance](inheritance-and-imports.md), building [model requirements](../book-language.md#two-stage-parsing), indexing `KNOWLEDGE` into provider-side vector stores) is expensive. The server therefore **prepares agents in the background** ahead of chat time and caches every derived artifact by content hash, so the first user message does not pay the indexing cost.

## Background preparation queue

State: one row per agent in `prefix_AgentPreparation` ([Data model](../data-model.md#prefix_agentpreparation)). The **fingerprint** of a preparation target is the agent's `agentHash`.

### Scheduling

`scheduleAgentPreparation` is invoked with a trigger reason whenever an agent's effective source may have changed — the agent collection is decorated so that creates schedule with `AGENT_CREATED` and source updates with `AGENT_UPDATED`. Rules:

-   Scheduling is **coalesced per agent** (unique row): a new request updates `targetFingerprint`, `triggerReason`, and pushes `runAfter = now + 30 s` (debounce window), so rapid edits collapse into one run.
-   When the row already shows `lastPreparedFingerprint == targetFingerprint`, scheduling is skipped (already prepared).
-   A fingerprint change resets `retryCount`/`lastError`; a `RUNNING` row is not demoted by new scheduling (the worker reconciles after finishing).

### Worker

An in-process worker loop (per deployment process; disabled in build/test contexts) processes due rows:

-   Ticks are triggered by: scheduling events, one-shot wake-up timers armed for the next `runAfter` (+100 ms buffer), and chat-time waits. Ticks never overlap within a process; each tick claims at most **2 jobs per table prefix** (optimistic claim: `SCHEDULED` + `runAfter <= now` → `RUNNING`).
-   A claimed job:
    1. Loads the agent; missing or deleted agents → `FAILED` with reason.
    2. If the agent's current `agentHash` differs from `targetFingerprint`, the job is re-scheduled for the newer fingerprint instead of running stale work.
    3. If `lastPreparedFingerprint == targetFingerprint` already → mark `PREPARED` (skip).
    4. Otherwise resolves the agent context and model requirements, then builds/refreshes the **AgentKit agent** (provider-side assistant + knowledge vector stores; retried up to 2 extra times with exponential backoff 1 s→10 s + jitter on retryable errors).
    5. Success → `PREPARED` (`lastPreparedFingerprint = targetFingerprint`, `lastDurationMs`); failure → `FAILED` with `lastError`, `retryCount++`, and re-schedule after a failure backoff (30 s base, doubling, capped at 15 min).
-   If the target fingerprint changed while running, the finished result is discarded in favor of re-scheduling for the latest fingerprint.

### Chat-time wait

Chat routes MAY briefly wait for a running preparation of the exact fingerprint they need (`waitForRunningAgentPreparation`, poll every 500 ms, total budget 2.5 s) to avoid duplicating expensive indexing that is about to finish; on timeout they proceed and prepare inline. A due-but-unclaimed row triggers an immediate worker kick.

## Knowledge indexing

`KNOWLEDGE` sources of the resolved book are indexed into a provider-side **vector store** used for retrieval at chat time:

-   Source **content hashes** are tracked in `prefix_VectorStoreKnowledgeSourceHashes` (`source`, `hash`, `etag`, `lastModified`, `sizeBytes`) so unchanged sources are detected without re-download.
-   Created vector stores are registered in `prefix_AgentExternals` as `{ type: 'VECTOR_STORE', hash: <knowledge-content hash>, externalId: <provider store id>, vendor: 'openai' }`. **Identical knowledge content reuses the same provider store across agents.** Vector-store cache keys depend only on knowledge file contents; dynamic `CONTEXT` lines affect the assistant cache key, not the store.

## Runtime caches

Layered from cheapest to most durable; all keys are content-derived so stale entries are impossible by construction (a source change changes the hash):

| Cache | Scope | Key | TTL / invalidation |
| --- | --- | --- | --- |
| Resolved agent context (resolved source, names, aliases) | in-process | agent identifier + source hash | 30 s TTL; explicitly invalidated on any agent update. |
| Prepared model requirements | in-process | resolved source hash | 30 s TTL; same invalidation. |
| Provider-side assistant/agent object | in-process + `prefix_OpenAiAssistantCache` | `agentHash` (assistant cache key includes dynamic context) | reused until source changes; cache misses during chat emit an `assistant_preparation` [tool frame](../chat/streaming-protocol.md#3-tool-call-frames). |
| Vector stores | provider-side + `prefix_AgentExternals` | knowledge content hash | reused until knowledge content changes. |
| Generic LLM responses | `prefix_LlmCache` | request hash | permanent content-addressed cache. |
| Failed federated imports | in-process | agent URL | 60 s negative cache ([Inheritance § Import mechanics](inheritance-and-imports.md#import-mechanics-shared-by-from-and-import)). |

In-flight deduplication applies to context resolution, remote imports, and federated lookups — concurrent identical requests share one computation.

## Generation locks

Expensive one-off generations (e.g. [AI avatar generation](avatars-and-visuals.md#ai-generated-avatars)) are guarded by cooperative locks in `prefix_GenerationLock` (`lockKey`, `expiresAt`): a worker acquires the key before generating, peers finding a live lock wait/skip, and expired locks are treated as free. This prevents duplicate provider spend when the same uncached asset is requested concurrently.
