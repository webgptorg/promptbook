[ ]

[✨🪇] Make Book `TEAM` commitments actually work in `ptbk coder run` and `ptbk coder plan`.

```bash
ptbk coder run --harness openai-codex --agent agents/developer.book
ptbk coder plan --harness openai-codex --agent agents/planner.book
```

-   The Book language already has a TEAM commitment and the Coder's source resolution already mentions TEAM. Analyze what currently resolves, what reaches the system message, and what can actually be invoked through each harness.
-   The required result is real teammate consultation during coding and planning, not merely listing teammates in a prompt or concatenating all their rules into the primary agent.
-   Reuse the existing TEAM meaning: the primary agent can ask a relevant teammate a question and receive that teammate's answer as a tool result.

## Book semantics and execution

-   Resolve TEAM from the effective selected Book, including inherited and imported commitments. It must work for default Developer/Planner Books and explicit custom `--agent` Books.
-   Preserve supported agent-name, Book-relative path, project-path, and URL reference semantics by reusing the existing resolver. Do not invent Coder-only TEAM syntax.
-   Support project-local helpers without requiring an Agents Server to be running. Preserve remote teammate support and its existing authentication/access rules where applicable.
-   Load a teammate's own role, instructions, inheritance, and relevant context. A Lawyer consultation must really use Lawyer's Book rather than ask the primary Developer to impersonate it.
-   Give the primary agent a discoverable callable capability for each resolved teammate, including its name and useful role description. Send the question and relevant task context, then return an attributed result to the caller.
-   Keep the primary agent responsible for the task and its final output. Declaring a team makes advisers available; it does not unconditionally run every teammate, replace the selected primary agent, or create another independent PRD queue.
-   Use a shared runtime bridge across Coder harnesses. An MCP/tool bridge or an appropriate existing harness capability may be used, but do not hardcode one provider's subagent feature as the only implementation.
-   Cover all currently supported Coder harnesses with the common contract. Detect missing required capabilities explicitly; never claim TEAM is active when declarations are silently ignored.

## Boundaries and lifecycle

-   Planning restrictions apply to the whole delegation tree. A Planner's teammate, even a custom Developer Book, must not gain implementation-write permissions through delegation.
-   Keep teammate capabilities within the caller's allowed tool and file scope. Only send context necessary for the consultation, and preserve existing restrictions on private agents, credentials, remote access, and untrusted instructions.
-   Teammates return results to the primary task. Do not introduce independent automatic commits, pushes, migrations, or queue processing for each consultation.
-   Keep consultations associated with the originating session, task, and invocation. Prevent cross-project or concurrent-session leakage of team definitions, messages, credentials, or cached results.
-   Reuse existing cancellation, timeout, error, and usage-accounting mechanisms. Bound recursive delegation and cyclic team graphs so a self-reference or A-to-B-to-A loop cannot create an unbounded run.
-   Report unresolved teammates, access failures, timeouts, and malformed results as attributed errors. Continue or stop according to the enclosing task's policy; do not fabricate a teammate answer or success.
-   Aggregate available usage/cost information without double counting. Do not make this a new billing system or force additional paid model calls when no teammate is consulted.
-   Record available consultation requests, results, failures, and nested tool activity in the existing trace model with primary/teammate attribution. Presentation belongs to the separate output PRD, not to a second competing UI.

## Acceptance criteria

-   With fixture Books and deterministic mock harnesses, Developer can ask Lawyer a question and incorporate the returned answer in the same coding task.
-   Planner can consult Copywriter, revise a PRD from the answer, and still change no application source.
-   A custom agent, inherited TEAM entries, local paths, and a remote teammate all use the same resolution and execution contract.
-   A contract test covers every advertised Coder harness adapter; integration fixtures verify that the teammate tool can actually be called, not only that its description exists.
-   Tests cover missing/duplicate references, recursive teams, timeout, cancellation, remote access failure, and concurrent sessions without data leakage.
-   A delegated attempt to bypass planning permissions is rejected before any implementation write.
-   Existing TEAM behavior in Agents Server remains functional; do not remove or regress its security checks while sharing code.

## Context and related work

-   [The helper-agent PRD](2026-09-0430-ptbk-coder-helper-agents-init.md) supplies the default Lawyer/Copywriter Books and declarations. This task must also work with arbitrary fixture teams without depending on init to execute them.
-   [The planning PRD](2026-09-0410-ptbk-coder-planner-and-plan.md) supplies `coder plan` and its write boundary. Integrate TEAM with both command paths.
-   Inspect [TEAM](../src/commitments/TEAM/TEAM.ts), [Book agent-source utilities](../src/book-2.0/agent-source), [local agent resolution](../src/cli/cli-commands/common/resolveLocalAgentSource.ts), [Coder agent resolution](../scripts/run-codex-prompts/common/resolveCoderAgent.ts), [runner system-message construction](../scripts/run-agent-messages/messages/createAgentRunnerSystemMessage.ts), and [Coder runners](../scripts/run-codex-prompts/runners).
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Reuse modern Book/TEAM infrastructure without bringing back the deprecated pipeline execution system.
-   Update relevant Book/CLI documentation and the [Coder landing website](../apps/coder-landing).
-   Add the changes into the [changelog](../changelog/_current-preversion.md).
