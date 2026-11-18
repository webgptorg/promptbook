# Inference runtimes and local models

[Main specification](../_main.md) · [Tools](tools.md) · [Harness adapters](harness-plugins.md) · [MODEL](../book-language/commitments/model.md)

**Local models** is a first-class resource category in Tools. Its internal type is `INFERENCE_RUNTIME`, initially with `OLLAMA` and `LM_STUDIO` variants. A runtime serves models; a harness owns the agent loop, tools and sessions; Promptbook owns agents, tasks, chats and orchestration. A runtime is not a harness, another Book entity or an agent-callable tool for bypassing harness execution. The resource manager does not implement another agent loop.

Mixed local/cloud use is normal. A project may use only local inference, only hosted inference or both, including through the same harness variant. Selecting local models adds a capability; it does not impose a project-wide local-only policy or replace existing accounts.

## Project references and machine resources

`ptbk.json.tools` contains named, enabled project references to runtimes using the common tool fields. `endpoint` is an optional non-secret local service URL; omission asks the runtime adapter to discover its supported local service. An explicit endpoint must be validated as serving the engine host, not merely the client displaying a Console/App. Do not publish a loopback service or change its network binding as part of ordinary setup. A remote service can be an explicit harness endpoint, but cannot satisfy `runtime=local`.

A harness record's optional `inferenceRuntime` references the unique name of an `INFERENCE_RUNTIME` record in the same project. Managed local connections use `baseUrl: LOCAL`, that reference and the supported authentication mode, normally `NONE`. The harness adapter translates this association into its actual provider/transport configuration. Reject a missing, disabled, wrong-type or incompatible reference with its concrete cause. Do not silently use the official endpoint or another similarly named resource.

Runtime records describe connection and project enablement, not installed-model allowlists or per-tool model/thinking defaults. Inventory, discovered paths, installed versions, downloaded models, active processes and capacity are observed machine state, outside Git. Model selection requirements remain in MODEL; plugin code plus discovered compatible models supplies setup recommendations and effective defaults.

Install/reuse a runtime and model store once per OS user on the engine host, across projects and Promptbook installations. Reuse an authorized existing system service when appropriate; do not require a duplicate per user, project or engine. Preserve the existing owner's model directory, service settings and independently installed software. A protected host resource registry records discovery, ownership and active consumers; it is not another user-level Promptbook settings layer, global engine or task scheduler. A Git clone on another machine rediscovers resources instead of trusting copied installation state.

Each project engine owns its inference-management domain. Engines coordinate the same actual service/model store even when project tool names or endpoint aliases differ. Coalesce installation/download operations and serialize maintenance of that shared resource. Do not stop resources merely because one engine or its viewer exits. Cross-user/system-service actions require the resource owner's supported permissions; never claim knowledge of all external consumers when it is unavailable.

## Runtime adapter contract

Init, CLI, Console and engine runtime use the same extensible runtime-adapter/domain operations. Each adapter exposes:

- supported OS/architecture/acceleration and runtime versions, discovery, ownership and installation/repair/update capabilities;
- observed service health and supported start, safe stop/restart and recovery operations;
- available and installed models with actual identifiers, model manufacturer/origin where known, version/digest, quantization, download size and disk/memory estimates where available;
- download progress, cancellation/resume support, load/unload/removal and active-consumer information;
- supported protocol endpoints and model capabilities usable by particular harness integrations.

Unsupported, unknown and stale observations are explicit. Enumeration/discovery/status never installs, downloads, authenticates or runs inference. Keep provider-specific commands, native package management and response parsing in adapters. Ordinary CLI use needs no Electron window or manually operated runtime GUI; a supported LM Studio daemon is another adapter transport, not a second management framework.

## Independent harness connections

`codex-subscription` and `codex-local` can share a global Codex executable while using native ChatGPT authentication and Ollama respectively. A separate `claude-subscription` and a supported `claude-local` connection follow the same rule. Other harnesses participate only when their installed version/transport actually supports the combination.

Apply provider selection, endpoint, model and authentication to the selected invocation/session. Never rewrite the CLI's global default provider/model, global login store, shell startup files or another connection's environment to configure local use. Runtime setup must not invoke a convenience launcher that persistently switches global harness configuration. If safe isolation is unavailable, report that combination as unsupported rather than breaking a working subscription. A compatible CLI can be installed for local use without requesting a cloud account.

`authentication: NONE` means that this connection needs no provider login or billing credential. It does not inherit ambient cloud keys or native subscription authentication. Any non-secret compatibility token required by a local client is invocation-scoped protocol data, not an authorized API key. A runtime requiring real credentials uses only an explicitly supported protected credential route; it must not be disguised as NONE. NATIVE and API_KEY retain their existing meanings and cannot be silently converted.

## Connection-scoped catalogs and capability checks

Discover/validate models against the selected connection and its runtime before rejecting a model. A hosted Codex catalog cannot prove that a model on Ollama is invalid. Catalog caching is keyed by the effective provider/endpoint/runtime and relevant version/authentication context; refreshing local inventory cannot replace the subscription catalog or vice versa. Distinguish an unknown model, incomplete catalog, not-yet-downloaded model, unloaded model, busy service and unsupported combination.

Usability is the intersection of harness transport, runtime protocol and actual model capabilities. Check tool/function calling, MCP use, context budget, supported effort controls, images and enforceable read-only operation independently. A text response is not proof of tool use or of the safety required by chat, TEAM and planning. A runtime being healthy does not make every model/harness pair usable. Compatibility evidence belongs to the actual versions and model/quantization; changing those invalidates affected evidence.

## Locality and data scope

`runtime=local` requires evidence that the selected model executes on the engine host. A localhost URL, OpenAI-compatible API or locally installed proxy is insufficient: a runtime may also serve cloud models. Exclude cloud-backed and unknown-locality models from hard-local candidates. Do not globally disable cloud features in a shared runtime merely to add a local connection; enforce locality for the selected model/route and preserve unrelated users' choices. Unknown model manufacturer/origin stays unknown independently of execution locality.

Local-only MODEL restricts that agent/task/chat's inference. It does not automatically constrain Router, a TEAM advisor, Fixer, speech services, network tools, Git synchronization or other agents. Show those boundaries when presenting local-only operation. A user requiring sensitive content to remain local must also select compatible local routing/advisors/helpers or omit sensitive content from their inputs; if a required dependency cannot comply, wait/report it rather than leak context through a cloud fallback. Do not imply that local inference alone is a complete data-egress/offline policy.

Fully local model operation must be possible without cloud credentials, including setup checks, project naming, Router bootstrap, ordinary chat, task execution and necessary consultations. Installation/catalog downloads can need network access. After preparation, local reasoning must not require cloud login or hosted model discovery; website tools, updates, synchronization, speech and image support retain their separate actual dependencies. Do not promise local voice or vision without a verified supporting combination.

## Shared capacity and lifecycle

Admission is per actual runtime/model resource across engines, based on supported concurrency, available memory/VRAM, loaded weights, context/KV memory and current work. Use honest estimates and observed limits; there is no new global task/chat count or fixed five-slot queue. Start conservatively where capacity is uncertain, expose the actual wait and re-evaluate on meaningful changes. Idle sessions do not reserve inference capacity or generate keep-alive model calls.

Release safe inference capacity between turns and while waiting for tools or a nested TEAM call. A parent cannot hold the sole inference slot while synchronously waiting for an advisor that needs it. Preserve session context/checkpoint where supported, use a compatible supported transport or report a concrete limitation; do not silently route the advisor to the cloud or deadlock the runtime. This requirement concerns inference admission, not the separately deferred file-lock deadlock problem.

Project disable/removal prevents new acquisitions through its runtime reference; already acquired uses follow [retained-use rules](tool-runtime.md). It never uninstalls the service or deletes model weights. Rename updates project references atomically; removal leaves dependent harnesses visibly unavailable until rebound, never reconnected implicitly. Changes do not grant dependent harnesses access to a different runtime.

Host-wide stop/restart, update, model replacement/removal or uninstall is a separate explicit maintenance action. Show its real shared scope, revalidate active consumers and refuse/defer while unsafe; project tool `--force` does not authorize killing other engines or deleting in-use models. Existing externally managed services are not stopped or uninstalled without separate owner authority. Managed processes are released only when no relevant consumers remain and ownership is verified. Engine Pause/Stop, consumer crash and OS restart preserve ordinary lifecycle intent; availability recovery never resumes deliberately paused tasks.

Model downloads and maintenance have inspectable progress and recoverable partial state outside project Git. Cancellation preserves existing healthy components and reports what remains; an interrupted download is never advertised as installed. Retry/recovery is bounded and cause-aware. Runtime loss waits only affected work, preserves session/external-effect evidence and refreshes readiness without a project restart. CPU offload or reduced context cannot silently substitute another model or violate requirements.

## Acceptance outcomes

Use the same service/model store from two engines and two Promptbook installations. Concurrent discovery/setup does not create duplicate daemons, downloads or competing maintenance. Closing one viewer, disabling one project's reference or stopping its engine leaves the other's work intact. Test alias endpoints, stale ownership after a crash, insufficient disk/RAM/VRAM and an unowned system service.

Run a subscription Codex task and local Codex task simultaneously, restart/reconnect the engine, and verify both account/provider contexts and catalogs remain independent. Repeat for each additional advertised harness/runtime combination. A hard-local agent rejects a cloud-backed model served at localhost. A single-slot runtime supports a nested consultation without parent/child admission deadlock; missing read-only/tool/MCP capability remains unavailable rather than falsely passing on a text response.
