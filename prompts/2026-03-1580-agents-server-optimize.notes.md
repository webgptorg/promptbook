## Analysis

-   The main latency was not only model execution. A large part of the delay was repeated server-side preparation that happened again on almost every message.
-   `resolveServerAgentContext(...)` was being recomputed in multiple hot paths (`/api/chat`, OpenAI-compatible chat, durable user-chat jobs, model-requirements endpoints, disclaimer checks).
-   `AgentKitCacheManager.getOrCreateAgentKitAgent(...)` was still doing expensive work even after an agent was already "prepared":
    -   rebuilding model requirements,
    -   re-resolving knowledge sources,
    -   re-checking vector-store hashes,
    -   rebuilding AgentKit preparation state per request.
-   The Teacher remote agent profile was fetched repeatedly for chats instead of being reused.
-   Several independent async lookups were serialized (identity/server/token resolution), which added avoidable wall-clock time before first tokens could stream.

## Implemented now

-   Added shared process-local cache for resolved server agent runtime snapshots.
-   Added shared process-local cache for prepared agent model requirements.
-   Reused the shared runtime cache in:
    -   `/agents/[agentName]/api/chat`
    -   OpenAI-compatible chat handling
    -   durable `runUserChatJob`
    -   background `agentPreparation`
    -   model-requirements + system-message endpoints
    -   durable user-chat enqueue disclaimer check
-   Upgraded `AgentKitCacheManager` so it can reuse caller-prepared model requirements and keep a short-lived in-memory cache of fully prepared AgentKit agents.
-   Fixed the prepared AgentKit cache key to include the resolved model-requirements payload so public-origin and internal-origin preparations do not cross-contaminate each other.
-   Cached the well-known Teacher remote agent connection.
-   Parallelized independent async lookups in the main chat hot paths.

## Remaining plan if more speed is still needed

-   Add durable, origin-aware prepared runtime persistence so the preparation survives cold starts and multi-instance deployments.
    -   The current improvement is process-local and fast, but not cross-instance.
-   Add per-phase timing instrumentation around:
    -   resolved-agent context,
    -   model-requirements preparation,
    -   AgentKit preparation,
    -   model execution,
    -   chat-history persistence.
-   Revisit canonical durable chat streaming if Supabase load is still high.
    -   It still polls snapshots; if needed later, switch to push/realtime or event-driven invalidation.
