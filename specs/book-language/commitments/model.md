# MODEL

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Agent, Task or Chat. Alias: `MODELS`.

One shared commitment expresses allowed execution combinations independently of the named tool/account that supplies them. An agent's effective MODEL is its durable requirement. A task may start with a partial requirement or no MODEL; [Router](../../agents/core-agents/router.md) specializes it to a concrete compatible choice before execution. A chat records the choice for that conversation. MODEL does not select a tool instance, API key, native account or browser profile.

## Combinations and filters

Use named fields in the content: `harness`, `model`, `thinking`, `provider`, `origin` and `runtime`. Fields on one content line apply **together**; multiple lines in the same commitment are **alternative complete combinations**. Do not independently union the columns and accidentally permit combinations that no row allowed. An omitted field or `*` permits any supported value in that dimension. A missing MODEL means no additional constraint, not missing authorization or invented capabilities. `MODEL *` explicitly expresses the unconstrained form.

```book
MODEL
harness=OPENAI_CODEX model=* thinking=high runtime=official
harness=CLAUDE_CODE model=* thinking=* runtime=official
```

This permits either combination, not a hybrid. Partial rows such as `harness=OPENAI_CODEX`, `provider=OpenAI` or `runtime=local` are useful before routing. Use the adapter's actual model IDs and supported effort values; examples are not a model catalog. Single-token field values cover identifiers, wildcard and base URL. Unknown/unsupported fields or values produce useful diagnostics and the common repair path rather than a guessed runnable selection.

`provider` describes the model's actual manufacturer, not its harness, hosting service or billing account; `origin` can restrict its declared country of origin, for example `origin=China`. Both use declared model metadata; unknown origin cannot be asserted to satisfy a restriction. A locally hosted OpenAI-compatible endpoint is not thereby an OpenAI-made model. Runtime and origin filters are independent.

`runtime` accepts `default`, `official`, `local` or an explicit base URL. **official** always means the fixed provider endpoint declared by the plugin; tool configuration cannot redefine it. **default** uses the selected tool's configured default endpoint, which may be official, local or custom. **local** means inference local to the engine's host, not the dashboard's device; it is not an arbitrary remote OpenAI-compatible service. An explicit URL requires that endpoint. See [tool endpoints](../../cli/tools.md#harness-endpoints).

## Resolution and change

Intersect the agent's alternatives with the task/chat's applicable requirements and actual enabled tool capabilities. Neither agent nor task overwrites the other's explicit restriction. Router chooses only within the resulting intersection and fills unresolved dimensions. A concrete choice uses actual supported values for applicable dimensions; model-native absence of a thinking control is not an unresolved wildcard. No compatible agent/combination leaves the original task blocked and creates a separate Fixer repair task. Temporary resource unavailability retains its actual wait rather than silently relaxing requirements.

Persist a single current MODEL for the task, progressively replacing its prior less-specific content in an ordinary commit. Do not add requested/resolved copies or an in-Book audit log; earlier values and authorship are in Git. The chosen combination does not bind a named tool, so eligible same-variant account fallback still works within the endpoint and other constraints. Recurring tasks reuse the saved choice until deliberately changed.

Chats preserve commitment chronology: definition/participants, first User message, resolved MODEL, first agent reply. Record the effective selection there even when inherited agent parameters already fully determine it, without an unnecessary Router call. Future mid-chat changes could append a later MODEL, but current behavior resolves once before the first reply. Reopening does not reroute.

`TASK HARNESS`, `TASK MODEL` and `TASK THINKING LEVEL` are former separate controls, replaced by this shared MODEL; deterministic project migrations consolidate their unambiguous meaning. Do not author two competing sets of execution requirements. Saving a problematic MODEL remains allowed with a warning; affected work waits for ordinary Fixer repair instead of crashing the engine.
